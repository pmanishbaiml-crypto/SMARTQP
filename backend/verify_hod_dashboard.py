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
mock_firebase.auth = mock_auth

# Configure the mock to return the user
mock_auth.verify_id_token.return_value = {'uid': 'test_hod_uid'}

# Mock Supabase Service
mock_supabase_service = MagicMock()
sys.modules['supabase_service'] = MagicMock()
sys.modules['supabase_service'].supabase_service = mock_supabase_service

# Now import app
try:
    from app import app
    import utils
    # Ensure utils uses our mock
    utils.auth = mock_auth
except Exception as e:
    print(f"Error importing app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Create a test client
client = app.test_client()

def test_get_pending_approvals():
    print("Testing /get_pending_approvals endpoint...")
    
    # Mock HOD user check
    mock_supabase_service.get_user_by_firebase_uid.return_value = {
        'id': 'hod_supabase_id',
        'role': 'hod',
        'department': 'CSE'
    }
    
    # Mock pending approvals
    mock_supabase_service.get_pending_approvals.return_value = [
        {
            'id': 'approval_1',
            'paper_id': 'paper_1',
            'submitted_by': 'faculty_1',
            'status': 'pending',
            'saved_question_papers': {
                'paper_name': 'Test Paper',
                'subject': 'Test Subject'
            },
            'users': {
                'name': 'Test Faculty',
                'email': 'faculty@test.com'
            }
        }
    ]
    
    headers = {'Authorization': 'Bearer mock_token'}
    
    try:
        response = client.get('/get_pending_approvals', headers=headers)
        
        print(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.get_json()
            print("SUCCESS: Route returned 200 OK")
            print(f"Approvals count: {len(data.get('approvals', []))}")
            if len(data.get('approvals', [])) == 1:
                print("SUCCESS: Returned correct number of approvals")
            else:
                print("FAILURE: Returned incorrect number of approvals")
                sys.exit(1)
        else:
            print(f"FAILURE: Route returned error: {response.status_code}")
            print(f"Error details: {response.get_json()}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Exception during test: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_get_pending_approvals()
