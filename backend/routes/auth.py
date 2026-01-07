from flask import Blueprint, request, jsonify
import firebase_admin
from firebase_admin import auth, firestore
from supabase_service import supabase_service
import time
from utils import firebase_auth_required

auth_bp = Blueprint('auth', __name__)
db_firestore = firestore.client()

# Simple rate limiting for authentication
auth_attempts = {}  # Store authentication attempts per IP
MAX_AUTH_ATTEMPTS = 5  # Maximum attempts per minute
AUTH_WINDOW = 60  # Time window in seconds

@auth_bp.route('/authenticate-backend', methods=['POST'])
def authenticate_backend():
    try:
        # Rate limiting check
        client_ip = request.remote_addr
        current_time = time.time()
        
        # Clean old attempts
        if client_ip in auth_attempts:
            auth_attempts[client_ip] = [attempt for attempt in auth_attempts[client_ip] if current_time - attempt < AUTH_WINDOW]
        else:
            auth_attempts[client_ip] = []
        
        # Check if rate limit exceeded
        if len(auth_attempts[client_ip]) >= MAX_AUTH_ATTEMPTS:
            return jsonify({
                'message': 'Too many authentication attempts. Please try again later.',
                'error_type': 'rate_limit_exceeded'
            }), 429
        
        # Record this attempt
        auth_attempts[client_ip].append(current_time)
        
        data = request.get_json()
        print(f"Received authentication request: {data}")
        
        if not data:
            return jsonify({'message': 'No JSON data received!'}), 400
            
        id_token = data.get('idToken')

        if not id_token:
            return jsonify({'message': 'ID token is missing!'}), 400

        print(f"Attempting to verify ID token for user...")
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name', 'User')

        print(f"Token verified successfully for user: {email} (UID: {uid})")

        # Create/update user in Firebase (keep existing)
        user_ref = db_firestore.collection('users').document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            user_ref.set({
                'email': email,
                'username': name,
                'created_at': firestore.SERVER_TIMESTAMP,
                'last_login': firestore.SERVER_TIMESTAMP
            })
            print(f"New user {uid} registered in Firestore.")
        else:
            user_ref.update({'last_login': firestore.SERVER_TIMESTAMP})
            print(f"User {uid} logged in and updated last_login in Firestore.")

        # Create/update user in Supabase
        try:
            supabase_user = supabase_service.create_user(
                firebase_uid=uid,
                email=email,
                name=name,
                role='faculty'  # Default role, can be updated later
            )
            if supabase_user:
                print(f"User {uid} synced to Supabase successfully.")
            else:
                print(f"Warning: Failed to sync user {uid} to Supabase.")
        except Exception as e:
            print(f"Error syncing user to Supabase: {e}")

        response_data = {
            'message': 'Backend authenticated successfully',
            'uid': uid,
            'email': email,
            'username': name
        }
        print(f"Sending response: {response_data}")
        return jsonify(response_data), 200
    except firebase_admin.auth.InvalidIdTokenError as e:
        print(f"Invalid ID token error: {e}")
        return jsonify({'message': 'Invalid or expired ID token.'}), 401
    except Exception as e:
        error_str = str(e)
        print(f"Authentication error: {error_str}")
        
        # Handle specific Firebase quota errors
        if "Quota exceeded" in error_str or "ResourceExhausted" in error_str or "429" in error_str:
            return jsonify({
                'message': 'Firebase quota exceeded. Please try again later or contact support.',
                'error_type': 'quota_exceeded'
            }), 429
        elif "Timeout" in error_str:
            return jsonify({
                'message': 'Authentication timeout. Please try again.',
                'error_type': 'timeout'
            }), 408
        else:
            return jsonify({'message': f'Authentication failed: {error_str}'}), 500

@auth_bp.route('/hod_register', methods=['POST'])
def hod_register():
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['email', 'password', 'name', 'department', 'hodCode']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Validate HOD code (you can customize this)
        valid_hod_codes = ['HOD2024', 'ADMIN123', 'DEPT_HEAD']  # Add your HOD codes here
        if data['hodCode'] not in valid_hod_codes:
            return jsonify({'error': 'Invalid HOD authorization code'}), 400

        # Create Firebase user
        user_record = auth.create_user(
            email=data['email'],
            password=data['password'],
            display_name=data['name']
        )

        # Set custom claims for HOD
        auth.set_custom_user_claims(user_record.uid, {'role': 'hod'})

        supabase_service.create_user(user_record.uid, data['email'], data['name'], 'hod', data['department'])

        return jsonify({
            'message': 'HOD registered successfully',
            'uid': user_record.uid
        }), 201

    except auth.EmailAlreadyExistsError:
        return jsonify({'error': 'Email already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/get_user_profile', methods=['GET'])
@firebase_auth_required
def get_user_profile():
    """Get current user profile including department"""
    user_uid = request.current_user_uid
    try:
        user_data = supabase_service.get_user_by_firebase_uid(user_uid)
        if user_data:
            return jsonify(user_data), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/hod_login', methods=['POST'])
def hod_login():
    try:
        data = request.get_json()
        id_token = data.get('idToken')

        if not id_token:
            return jsonify({'error': 'ID token is required'}), 400

        # Verify the ID token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        # Check for HOD role in Firebase claims
        firebase_role = decoded_token.get('role')
        print(f"DEBUG: HOD Login Attempt - UID: {uid}, Firebase Role: {firebase_role}")

        # Check if user is HOD using Supabase
        hod_user = supabase_service.get_user_by_firebase_uid(uid)
        print(f"DEBUG: Supabase User: {hod_user}")
        
        # Auto-sync: If user missing in Supabase but has HOD claim in Firebase, create them
        if not hod_user and firebase_role == 'hod':
            print(f"User {uid} missing in Supabase but has HOD claim. Syncing...")
            email = decoded_token.get('email')
            name = decoded_token.get('name', 'HOD User')
            # We might not have department/institution here, but we can update later
            hod_user = supabase_service.create_user(uid, email, name, 'hod')
            
        if not hod_user or hod_user.get('role') != 'hod':
            print(f"DEBUG: Access Denied. User Role: {hod_user.get('role') if hod_user else 'None'}")
            return jsonify({'error': 'Access denied. HOD privileges required.'}), 403

        return jsonify({
            'message': 'HOD login successful',
            'user': {
                'uid': uid,
                'email': hod_user.get('email'),
                'name': hod_user.get('name'),
                'department': hod_user.get('department'),
                'institution': hod_user.get('institution', 'Unknown Institution'),
                'role': 'hod'
            }
        }), 200

    except auth.InvalidIdTokenError:
        return jsonify({'error': 'Invalid or expired token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify_hod', methods=['POST'])
@firebase_auth_required
def verify_hod():
    try:
        user_uid = request.current_user_uid

        # Check if user is HOD using Supabase
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({'error': 'Access denied. HOD privileges required.'}), 403

        return jsonify({
            'isHOD': True,
            'user': {
                'uid': user_uid,
                'email': hod_user.get('email'),
                'name': hod_user.get('name'),
                'department': hod_user.get('department'),
                'institution': hod_user.get('institution', 'Unknown Institution'),
                'role': 'hod'
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
