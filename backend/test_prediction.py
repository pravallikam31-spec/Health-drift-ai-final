import argparse
import json
import mimetypes
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_PREDICT_URL = "http://127.0.0.1:5000/predict"
DEFAULT_STATUS_URL = "http://127.0.0.1:5000/"


def check_health(status_url: str):
    print(f"Checking health endpoint: {status_url} ...")
    try:
        req = Request(status_url, headers={"Accept": "application/json"}, method="GET")
        with urlopen(req, timeout=10) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            print(f"HTTP {status_code} Response:")
            try:
                print(json.dumps(json.loads(body), indent=2))
            except json.JSONDecodeError:
                print(body)
            return True
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP Error {e.code} ({e.reason}):\n{err_body}")
        return False
    except URLError as e:
        print(f"Connection Failed: {e.reason}")
        return False


def test_predict(image_path: Path, predict_url: str):
    if not image_path.is_file():
        print(f"Error: Image file does not exist: {image_path}", file=sys.stderr)
        return False

    boundary = uuid.uuid4().hex
    content_type = mimetypes.guess_type(image_path.name)[0] or "image/jpeg"

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    body += image_path.read_bytes()
    body += f"\r\n--{boundary}--\r\n".encode("utf-8")

    print(f"Sending {image_path.name} ({len(body)} bytes) to {predict_url} ...")

    request = Request(
        predict_url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            status_code = response.getcode()
            result = json.loads(response.read().decode("utf-8"))
            print(f"\nHTTP {status_code} Prediction Result:")
            print(json.dumps(result, indent=2))
            return True
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"\nHTTP Error {e.code} ({e.reason}):\n{err_body}", file=sys.stderr)
        return False
    except URLError as e:
        print(f"\nConnection Error: {e.reason}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Test the local Flask Food Prediction API."
    )
    parser.add_argument("image_path", type=Path, nargs="?", help="Path to a test image file")
    parser.add_argument(
        "--url",
        default=DEFAULT_PREDICT_URL,
        help=f"Predict API endpoint URL (default: {DEFAULT_PREDICT_URL})",
    )
    parser.add_argument(
        "--health",
        action="store_true",
        help="Check the GET / health endpoint instead of running a prediction",
    )

    args = parser.parse_args()

    if args.health or not args.image_path:
        base_url = args.url.rsplit("/predict", 1)[0] + "/"
        success = check_health(base_url)
        if not args.image_path:
            return 0 if success else 1

    success = test_predict(args.image_path, args.url)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
