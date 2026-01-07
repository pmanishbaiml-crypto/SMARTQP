import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock firebase_admin before importing app
mock_firebase = MagicMock()
sys.modules['firebase_admin'] = mock_firebase
mock_auth = MagicMock()
sys.modules['firebase_admin.auth'] = mock_auth
mock_firestore = MagicMock()
sys.modules['firebase_admin.firestore'] = mock_firestore

# Link them (optional but good practice)
mock_firebase.auth = mock_auth

# Configure the mock to return the user
mock_auth.verify_id_token.return_value = {'uid': 'test_user'}

# Now import app
from app import app
    
# Create a test client
client = app.test_client()
    
# Sample data for PDF generation (Nested structure)
sample_data = {
    "subject": "Test Subject",
    "paper_id": "test_paper_123",
    "metadata": {
        "subject": "Test Subject",
        "dept": "CSE",
        "date": "2023-10-27",
        "time": "10:00 AM",
        "sem": "5",
        "div": "A",
        "code": "18CS51"
    },
    "question_paper_data": [
        {
            "main_question": "Q1",
            "subQuestions": [
                {
                    "question_text": "What is the capital of France?",
                    "marks": 2,
                    "co": "CO1",
                    "blooms_level": "L1",
                    "module": "1"
                },
                {
                    "question_text": "Explain the theory of relativity.",
                    "marks": 8,
                    "co": "CO2",
                    "blooms_level": "L2",
                    "module": "2"
                }
            ]
        },
        {
            "main_question": "Q2",
            "subQuestions": [
                {
                    "question_text": "Define polymorphism.",
                    "marks": 5,
                    "co": "CO3",
                    "blooms_level": "L1",
                    "module": "3"
                }
            ]
        }
    ]
}

print("Testing /generate_final_document endpoint...")

headers = {'Authorization': 'Bearer mock_token'}

try:
    response = client.post('/generate_final_document', 
                            data=json.dumps(sample_data),
                            content_type='application/json',
                            headers=headers)
    
    print(f"Response Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("SUCCESS: PDF generation route works!")
        # Check content type
        content_type = response.headers.get('Content-Type')
        print(f"Content-Type: {content_type}")
        
        if 'application/pdf' in content_type:
            print("SUCCESS: Content-Type is PDF")
        else:
            print(f"FAILURE: Unexpected Content-Type: {content_type}")
            sys.exit(1)
            
        # Check if file content is not empty
        if len(response.data) > 0:
            print(f"File size: {len(response.data)} bytes")
        else:
            print("FAILURE: Empty file returned")
            sys.exit(1)
    else:
        print(f"FAILURE: Route returned error: {response.status_code}")
        try:
            error_msg = str(response.get_json())
            print(f"Error details: {error_msg}")
            with open('verification_error.txt', 'w') as f:
                f.write(error_msg)
        except:
            error_msg = str(response.data)
            print(f"Error details (raw): {error_msg}")
            with open('verification_error.txt', 'w') as f:
                f.write(error_msg)
        sys.exit(1)
        
except Exception as e:
    print(f"Exception during test: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
