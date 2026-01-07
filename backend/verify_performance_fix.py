import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock Firebase Admin
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.credentials'] = MagicMock()
sys.modules['firebase_admin.auth'] = MagicMock()
sys.modules['firebase_admin.firestore'] = MagicMock()

# Mock other dependencies
sys.modules['supabase_service'] = MagicMock()

from app import app, firebase_auth_required

# Mock the auth decorator to bypass check
def mock_auth_required(f):
    def decorated(*args, **kwargs):
        # Mock current user
        from flask import request
        request.current_user_uid = "test_user_123"
        return f(*args, **kwargs)
    return decorated

# Apply mock to the app's view functions if possible, or just test the logic
# Since decorators are applied at import time, we might need to patch the route handler directly
# or just use the app.test_client() and mock the auth verification inside the route?
# Actually, since we already imported app, the decorators are applied.
# We need to patch `firebase_admin.auth.verify_id_token` to return a dummy user.

with patch('firebase_admin.auth.verify_id_token') as mock_verify:
    mock_verify.return_value = {'uid': 'test_user_123', 'email': 'test@example.com'}
    
    # Mock Firestore client
    with patch('app.db_firestore') as mock_db:
        # Mock get_saved_items logic
        # We need to mock the collection().document().collection()... calls
        
        # Mock banks_ref.order_by().stream()
        mock_stream = MagicMock()
        mock_doc = MagicMock()
        mock_doc.to_dict.return_value = {
            'id': 'bank_1',
            'name': 'Test Bank',
            'uploaded_at': '2023-01-01'
        }
        mock_doc.id = 'bank_1'
        mock_stream.return_value = [mock_doc]
        
        # Setup the chain: db.collection().document().collection().order_by().stream()
        mock_db.collection.return_value.document.return_value.collection.return_value.order_by.return_value.stream = mock_stream
        
        # Also mock the lazy migration path (empty list first)
        # But for now let's just test the happy path
        
        with app.test_client() as client:
            print("Testing /get_saved_items...")
            # We need to pass a dummy token header
            response = client.get('/get_saved_items', headers={'Authorization': 'Bearer dummy_token'})
            
            if response.status_code == 200:
                data = response.get_json()
                print("✅ /get_saved_items returned 200 OK")
                print(f"Keys in response: {list(data.keys())}")
                if 'question_banks' in data:
                    print(f"✅ 'question_banks' found in response with {len(data['question_banks'])} items")
                else:
                    print("❌ 'question_banks' NOT found in response")
            else:
                print(f"❌ /get_saved_items failed with status {response.status_code}")
                print(response.get_data(as_text=True))

            print("\nTesting /get_recent_papers...")
            response = client.get('/get_recent_papers', headers={'Authorization': 'Bearer dummy_token'})
            
            if response.status_code == 200:
                data = response.get_json()
                print("✅ /get_recent_papers returned 200 OK")
                if 'recent_papers' in data:
                    print(f"✅ 'recent_papers' found in response with {len(data['recent_papers'])} items")
            else:
                print(f"❌ /get_recent_papers failed with status {response.status_code}")
