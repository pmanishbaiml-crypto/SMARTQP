
import requests
import json

url = 'http://127.0.0.1:5000/api/test/parse_bank'
payload = {'filename': 'Module-3 Question Bank.pdf'}
headers = {'Content-Type': 'application/json'}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, headers=headers, timeout=120) # 2 min timeout
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success!")
        print(f"Number of items parsed: {len(data.get('data', []))}")
        # Check for images
        images_count = sum(len(item.get('images', [])) for item in data.get('data', []))
        print(f"Total images found: {images_count}")
        
        # Print first 10 questions to verify splitting and image association
        print("\n--- First 10 Questions ---")
        for i, item in enumerate(data.get('data', [])[:10]):
            images = item.get('images', [])
            img_str = f" [IMAGES: {', '.join(images)}]" if images else ""
            print(f"Q{i+1} (SL: {item.get('sl_no')}): {item.get('text')[:50]}...{img_str}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
