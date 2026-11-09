import io
import json
import logging
import sys
import traceback
from pathlib import Path

import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageFile, ImageOps, UnidentifiedImageError

# Try to register HEIF opener for Samsung/Apple camera uploads if pillow_heif is installed
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

# Configure logging to stdout with timestamp and level
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("FoodRecognitionBackend")

# Pillow settings: allow large phone camera images and truncated uploads
ImageFile.LOAD_TRUNCATED_IMAGES = True
Image.MAX_IMAGE_PIXELS = None  # Prevent DecompressionBombError on high-res phone cameras

BACKEND_DIR = Path(__file__).resolve().parent
MODEL_PATH = BACKEND_DIR / "best_food_model.keras"
CLASS_NAMES_PATH = BACKEND_DIR / "food_class_names.json"
IMAGE_SIZE = (224, 224)

logger.info("Initializing Food Recognition Backend...")
logger.info("Model path: %s", MODEL_PATH)
logger.info("Class names path: %s", CLASS_NAMES_PATH)

if not MODEL_PATH.exists():
    logger.error("FATAL: Model file not found at %s", MODEL_PATH)
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

if not CLASS_NAMES_PATH.exists():
    logger.error("FATAL: Class names file not found at %s", CLASS_NAMES_PATH)
    raise FileNotFoundError(f"Class names file not found: {CLASS_NAMES_PATH}")

with CLASS_NAMES_PATH.open("r", encoding="utf-8") as class_names_file:
    class_names = json.load(class_names_file)

if not isinstance(class_names, list) or not all(
    isinstance(name, str) for name in class_names
):
    raise ValueError("food_class_names.json must contain a JSON array of class names.")

logger.info("Loaded %d food classes.", len(class_names))

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    logger.info("Successfully loaded MobileNetV3Small model: %s", model.name)
    logger.info("Model input shape: %s", getattr(model, "input_shape", "unknown"))
    logger.info("Model output shape: %s", getattr(model, "output_shape", "unknown"))
except Exception as e:
    logger.error("FATAL: Failed to load Keras model: %s\n%s", e, traceback.format_exc())
    raise

app = Flask(__name__)
# Enable CORS globally across all origins and headers
CORS(app, resources={r"/*": {"origins": "*"}})


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    return response


@app.errorhandler(Exception)
def handle_exception(e):
    tb = traceback.format_exc()
    logger.error("Unhandled Exception in request [%s %s]: %s\n%s", request.method, request.path, e, tb)
    response = jsonify(
        {
            "error": str(e),
            "error_type": type(e).__name__,
            "status": "error",
            "traceback": tb.splitlines()[-8:] if tb else [],
        }
    )
    response.status_code = 500
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Content-Type"] = "application/json"
    return response


@app.route("/", methods=["GET", "OPTIONS"])
def status():
    if request.method == "OPTIONS":
        return "", 204
    return jsonify(
        {
            "status": "ok",
            "model": "MobileNetV3Small",
            "num_classes": len(class_names),
            "input_size": list(IMAGE_SIZE),
        }
    )


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 204

    current_stage = "VALIDATE_REQUEST"
    logger.info("========================================")
    logger.info("POST /predict request received from %s", request.remote_addr)

    try:
        # [STAGE 1] Validate uploaded files
        current_stage = "IMAGE_UPLOAD_VALIDATION"
        logger.info("[STAGE 1] Checking form field 'image' in request.files")
        if "image" not in request.files:
            available_keys = list(request.files.keys())
            logger.warning("[STAGE 1] Missing 'image' field. Available keys: %s", available_keys)
            return (
                jsonify(
                    {
                        "error": 'Missing uploaded file in form field "image".',
                        "available_fields": available_keys,
                        "stage": current_stage,
                    }
                ),
                400,
            )

        uploaded_image = request.files["image"]
        filename = uploaded_image.filename or "unknown"
        content_type = uploaded_image.content_type or "unknown"
        logger.info(
            "[STAGE 1] Found 'image' field: filename='%s', content_type='%s'",
            filename,
            content_type,
        )

        if not filename or filename == "unknown":
            logger.warning("[STAGE 1] No filename provided.")
            return jsonify({"error": "No image file was selected.", "stage": current_stage}), 400

        # Read the file content completely into memory (avoids Windows tempfile stream seek/lock issues)
        current_stage = "READ_IMAGE_BYTES"
        raw_bytes = uploaded_image.read()
        file_size_kb = len(raw_bytes) / 1024.0
        logger.info("[STAGE 1] Successfully read %d bytes (%.2f KB) from upload", len(raw_bytes), file_size_kb)

        if len(raw_bytes) == 0:
            logger.error("[STAGE 1] Uploaded file has 0 bytes.")
            return jsonify({"error": "Uploaded image file is empty (0 bytes).", "stage": current_stage}), 400

        # [STAGE 2] PIL Image decoding
        current_stage = "PIL_IMAGE_DECODING"
        logger.info("[STAGE 2] Decoding image using PIL from BytesIO")
        try:
            image = Image.open(io.BytesIO(raw_bytes))
            logger.info(
                "[STAGE 2] Image opened successfully: format=%s, size=%s, mode=%s",
                image.format,
                image.size,
                image.mode,
            )
        except (UnidentifiedImageError, OSError, ValueError) as decode_err:
            logger.error("[STAGE 2] Failed to decode image: %s", decode_err)
            return (
                jsonify(
                    {
                        "error": f"The uploaded file could not be decoded as an image: {decode_err}",
                        "stage": current_stage,
                    }
                ),
                400,
            )

        # [STAGE 3] EXIF normalization & RGB conversion & resize to 224x224
        current_stage = "IMAGE_PREPROCESSING"
        logger.info("[STAGE 3] Normalizing EXIF orientation, converting to RGB, and resizing to %s", IMAGE_SIZE)
        try:
            # Fix camera orientation from phone EXIF metadata
            image = ImageOps.exif_transpose(image)
        except Exception as exif_err:
            logger.warning("[STAGE 3] EXIF transpose skipped: %s", exif_err)

        if image.mode != "RGB":
            logger.info("[STAGE 3] Converting image mode from '%s' to 'RGB'", image.mode)
            image = image.convert("RGB")

        # Resize using high quality resampling
        resample_filter = getattr(Image, "Resampling", Image).BILINEAR
        image = image.resize(IMAGE_SIZE, resample_filter)
        logger.info("[STAGE 3] Image resized to %s, mode=%s", image.size, image.mode)

        # [STAGE 4] NumPy array conversion and batch expansion
        current_stage = "NUMPY_CONVERSION"
        logger.info("[STAGE 4] Converting PIL image to NumPy float32 array")
        image_array = np.asarray(image, dtype=np.float32)
        logger.info("[STAGE 4] Array shape before batch expansion: %s, dtype: %s, min: %.1f, max: %.1f",
                    image_array.shape, image_array.dtype, image_array.min(), image_array.max())

        image_batch = np.expand_dims(image_array, axis=0)
        logger.info("[STAGE 4] Batch input shape: %s", image_batch.shape)

        # [STAGE 5] Model inference
        current_stage = "MODEL_INFERENCE"
        logger.info("[STAGE 5] Running inference on MobileNetV3Small model...")

        predictions = None
        # Try direct callable inference first (faster and thread-safe in Flask)
        try:
            raw_output = model(image_batch, training=False)
            if hasattr(raw_output, "numpy"):
                predictions = raw_output.numpy()
            else:
                predictions = np.asarray(raw_output)
            logger.info("[STAGE 5] Callable model inference succeeded. Raw output shape: %s", predictions.shape)
        except Exception as call_err:
            logger.warning("[STAGE 5] Direct callable model(x) failed (%s), falling back to model.predict(x)", call_err)
            raw_output = model.predict(image_batch, verbose=0)
            predictions = np.asarray(raw_output)
            logger.info("[STAGE 5] model.predict(x) succeeded. Raw output shape: %s", predictions.shape)

        if predictions is None:
            raise RuntimeError("Model inference produced None as output.")

        # Flatten batch dimension if needed
        if predictions.ndim == 2 and predictions.shape[0] == 1:
            predictions = predictions[0]
        elif predictions.ndim != 1:
            predictions = predictions.flatten()

        logger.info("[STAGE 5] Processed prediction vector: length=%d, sum=%.4f", len(predictions), float(np.sum(predictions)))

        # [STAGE 6] Output validation against class names
        current_stage = "CLASS_MAPPING"
        logger.info("[STAGE 6] Validating output dimensions against %d class names", len(class_names))
        if len(predictions) != len(class_names):
            logger.error("[STAGE 6] Model output length (%d) does not match class names count (%d)",
                         len(predictions), len(class_names))
            return (
                jsonify(
                    {
                        "error": f"Model output dimension ({len(predictions)}) does not match class list ({len(class_names)}).",
                        "model_output_len": len(predictions),
                        "class_names_len": len(class_names),
                        "stage": current_stage,
                    }
                ),
                500,
            )

        # Extract top 5 predictions
        top_indices = np.argsort(predictions)[-5:][::-1]
        top_predictions = [
            {
                "food_name": str(class_names[int(idx)]),
                "confidence": round(float(predictions[int(idx)]), 4),
            }
            for idx in top_indices
        ]
        best_prediction = top_predictions[0]

        logger.info(
            "[STAGE 6] Top prediction: '%s' (confidence: %.2f%%)",
            best_prediction["food_name"],
            best_prediction["confidence"] * 100,
        )
        for rank, p in enumerate(top_predictions, start=1):
            logger.info("  #%d: %s (%.2f%%)", rank, p["food_name"], p["confidence"] * 100)

        # [STAGE 7] JSON response generation
        current_stage = "RESPONSE_GENERATION"
        response_payload = {
            "status": "success",
            "predicted_food": best_prediction["food_name"],
            "confidence": best_prediction["confidence"],
            "top_5_predictions": top_predictions,
        }
        logger.info("[STAGE 7] Returning successful prediction JSON response.")
        logger.info("========================================")
        return jsonify(response_payload)

    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("Exception during predict() at stage [%s]: %s\n%s", current_stage, exc, tb)
        return (
            jsonify(
                {
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                    "stage": current_stage,
                    "status": "error",
                    "traceback": tb.splitlines()[-8:] if tb else [],
                }
            ),
            500,
        )


if __name__ == "__main__":
    logger.info("Starting Flask server on http://0.0.0.0:5000...")
    app.run(host="0.0.0.0", port=5000, threaded=True)
