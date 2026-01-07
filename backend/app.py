import os
from flask import Flask
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
from dotenv import load_dotenv
from extensions import cache

# Load environment variables
load_dotenv()

# --- Firebase Admin SDK Initialization (MUST BE BEFORE BLUEPRINT IMPORTS) ---
if not firebase_admin._apps:
    try:
        service_account_path = 'skit-qp-firebase-adminsdk-fbsvc-146911a4da.json'
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized using service account JSON file.")
        else:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized using Application Default Credentials.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
else:
    print("Firebase Admin SDK already initialized.")

# --- Import Blueprints (After Firebase Init) ---
# We import these here to ensure Firebase is initialized before any Blueprint
# tries to access Firestore (e.g. at module level)
from routes.auth import auth_bp
from routes.question_paper import qp_bp
from routes.admin import admin_bp
from routes.main import main_bp

app = Flask(__name__)
CORS(app)

# --- Cache Configuration ---
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300
cache.init_app(app)

# --- File Upload Configuration ---
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- Secret Key ---
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'your_super_secret_key_change_this_in_production')

# --- Register Blueprints ---
app.register_blueprint(auth_bp)
app.register_blueprint(qp_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(main_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
