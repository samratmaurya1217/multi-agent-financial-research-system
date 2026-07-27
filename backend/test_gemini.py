import httpx
import os

# Get API key from environment variable
key = os.getenv("GEMINI_API_KEY", "your_api_key_here")
# Get API key from environment variable
key = os.getenv("GEMINI_API_KEY", "your_api_key_here")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

try:
    resp = httpx.get(url, timeout=10.0)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        for m in resp.json().get("models", []):
            print(m["name"])
    else:
        print(resp.text)
except Exception as e:
    print(f"Failed: {e}")
