import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock firebase_admin before importing app
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.auth'] = MagicMock()
sys.modules['firebase_admin.firestore'] = MagicMock()

# Mock the auth verify function
with patch('firebase_admin.auth.verify_id_token') as mock_verify:
    mock_verify.return_value = {'uid': 'test_user'}
    
    # Now import app
    from app import app
    
    # Create a test client
    client = app.test_client()
    
    # Sample data for DOCX generation
    sample_data = {
        "subject": "Test Subject",
        "paper_id": "test_paper_docx",
        "format": "docx",
        "question_paper_data": [
            {
                "sl_no": 1,
                "question_text": "What is the capital of France?",
                "marks": 2,
                "co": "CO1",
                "blooms_level": "L1",
                "module": "1"
            }
        ]
    }
    
    print("Testing /generate_final_document endpoint for DOCX...")
    
    headers = {'Authorization': 'Bearer mock_token'}
    
    try:
        response = client.post('/generate_final_document', 
                               data=json.dumps(sample_data),
                               content_type='application/json',
                               headers=headers)
        
        print(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("SUCCESS: DOCX generation route works!")
            # Check content type
            content_type = response.headers.get('Content-Type')
            print(f"Content-Type: {content_type}")
            
            if 'wordprocessingml.document' in content_type:
                print("SUCCESS: Content-Type is DOCX")
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
                print(f"Error details: {response.get_json()}")
            except:
                print(f"Error details: {response.data}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Exception during test: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
