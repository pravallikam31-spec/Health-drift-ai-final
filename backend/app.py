import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError


BACKEND_DIR = Path(__file__).resolve().parent
MODEL_PATH = BACKEND_DIR / "best_food_model.keras"
CLASS_NAMES_PATH = BACKEND_DIR / "food_class_names.json"
IMAGE_SIZE = (224, 224)

with CLASS_NAMES_PATH.open("r", encoding="utf-8") as class_names_file:
    class_names = json.load(class_names_file)

if not isinstance(class_names, list) or not all(
    isinstance(name, str) for name in class_names
):
    raise ValueError("food_class_names.json must contain a JSON array of class names.")

model = tf.keras.models.load_model(MODEL_PATH)

app = Flask(__name__)
CORS(app)


@app.get("/")
def status():
    return jsonify(
        {
            "status": "ok",
            "num_classes": len(class_names),
        }
    )


@app.post("/predict")
def predict():
    if "image" not in request.files:
        return jsonify({"error": 'Missing uploaded file in form field "image".'}), 400

    uploaded_image = request.files["image"]
    if not uploaded_image.filename:
        return jsonify({"error": "No image file was selected."}), 400

    try:
        image = Image.open(uploaded_image.stream).convert("RGB")
    except (UnidentifiedImageError, OSError):
        return jsonify({"error": "The uploaded file is not a valid image."}), 400

    image = image.resize(IMAGE_SIZE)
    image_array = np.asarray(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    predictions = np.asarray(model.predict(image_array, verbose=0))[0]
    if predictions.ndim != 1 or len(predictions) != len(class_names):
        return jsonify({"error": "Model output does not match the class names."}), 500

    top_indices = np.argsort(predictions)[-5:][::-1]
    top_predictions = [
        {
            "food_name": class_names[index],
            "confidence": float(predictions[index]),
        }
        for index in top_indices
    ]
    best_prediction = top_predictions[0]

    return jsonify(
        {
            "predicted_food": best_prediction["food_name"],
            "confidence": best_prediction["confidence"],
            "top_5_predictions": top_predictions,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
