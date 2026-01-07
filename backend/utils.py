from functools import wraps
from flask import request, jsonify
import firebase_admin
from firebase_admin import auth

def firebase_auth_required(f):
    """Decorator to protect routes, verifying Firebase ID tokens."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'Authorization header is missing!'}), 401

        try:
            # Token format: "Bearer <ID_TOKEN>"
            id_token = auth_header.split(' ')[1]
            # Verify the Firebase ID token
            decoded_token = auth.verify_id_token(id_token)
            request.current_user_uid = decoded_token['uid'] # Attach UID to request object
            return f(*args, **kwargs)
        except firebase_admin.auth.InvalidIdTokenError:
            return jsonify({'message': 'Invalid or expired authentication token.'}), 401
        except Exception as e:
            return jsonify({'message': f'Authentication error: {str(e)}'}), 500
    return decorated_function

ALLOWED_EXTENSIONS = {'pdf', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
