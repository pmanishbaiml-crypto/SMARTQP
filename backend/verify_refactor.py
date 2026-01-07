import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("Attempting to import app...")
    from app import app
    print("Successfully imported app.")

    print("Attempting to import services...")
    from services.formatting_service import clean_text
    from services.parsing_service import parse_pdf_question_bank
    print("Successfully imported services.")

    print("Refactoring verification successful!")
except Exception as e:
    print(f"Verification failed: {e}")
    import traceback
    traceback.print_exc()
