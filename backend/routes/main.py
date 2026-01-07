from flask import Blueprint, render_template, send_from_directory, jsonify, request, current_app
import os
from utils import firebase_auth_required

main_bp = Blueprint('main', __name__)

@main_bp.route('/login')
@main_bp.route('/')
def login_page():
    return render_template('login.html')

@main_bp.route('/register')
def register_page():
    return render_template('register.html')

@main_bp.route('/hod-login')
def hod_login_page():
    return render_template('hod_login.html')

@main_bp.route('/hod-register')
def hod_register_page():
    return render_template('hod_register.html')

@main_bp.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@main_bp.route('/hod-dashboard')
def hod_dashboard_page():
    return render_template('hod_dashboard.html')

@main_bp.route('/protected_data', methods=['GET'])
@firebase_auth_required
def protected_data():
    user_uid = request.current_user_uid
    return jsonify({'message': f'Hello, user {user_uid}! You accessed protected data.'}), 200

@main_bp.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@main_bp.route('/extracted_images/<path:filename>')
def serve_extracted_image(filename):
    return send_from_directory('extracted_images', filename)

# Route to serve uploaded/generated files (duplicate in original app.py, keeping one)
@main_bp.route('/uploads/<path:filename>')
def serve_uploads(filename):
    """Serve files from the uploads directory"""
    response = send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
    # Ensure correct MIME type for PDFs
    if filename.lower().endswith('.pdf'):
        response.headers['Content-Type'] = 'application/pdf'
    return response
