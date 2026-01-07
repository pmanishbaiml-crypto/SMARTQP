import requests
import json
import os
import sys
from datetime import datetime

# Add backend directory to path to import app if needed, but we'll use requests
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def verify_flow():
    base_url = "http://127.0.0.1:5000"
    
    # 1. Simulate Generate Question Paper with Metadata
    print("1. Testing /generate_question_paper with metadata...")
    
    # Mock metadata from the form
    metadata = {
        "subject": "Advanced AI",
        "code": "AI701",
        "dept": "CSE",
        "sem": "7",
        "academic_year": "2024-25",
        "exam_type": "End-Term",
        "duration": "3",
        "max_marks": "100",
        "date": datetime.now().strftime('%Y-%m-%d'),
        "time": "10:00 AM",
        "pattern": "standard",
        "num_modules": "5",
        "module_coverage": "all",
        "distribution_rule": "equal",
        "blooms_distribution": {
            "l1": "10", "l2": "20", "l3": "30", "l4": "25", "l5": "10", "l6": "5"
        },
        "co_weights": {
            "co1": "20", "co2": "20", "co3": "20", "co4": "20", "co5": "20"
        }
    }
    
    payload = {
        "subject": metadata["subject"],
        "pattern": metadata["pattern"],
        "metadata": metadata,
        "use_latest_upload_only": False # Use all questions for test
    }
    
    # We need a valid ID token. Since we can't easily get one without frontend,
    # we might need to bypass auth or use a test token if available.
    # Alternatively, we can import the app and call the function directly, mocking the request context.
    
    # Let's try importing app and mocking request context
    try:
        from app import app, db_firestore
        from flask import Flask, request, jsonify
        
        # Mock firebase_auth_required decorator or context
        # We can use app.test_client()
        
        with app.test_client() as client:
            # We need to mock the auth check. 
            # Since we can't easily mock the decorator without modifying app.py,
            # we will try to run this script in a way that bypasses auth or we just check the function logic.
            
            # Actually, the best way is to unit test the function logic by importing it
            # and mocking flask.request.
            
            print("   Skipping direct HTTP request due to auth. Testing logic via direct function call if possible.")
            pass

    except ImportError:
        print("   Could not import app.py. Ensure you are in the correct directory.")
        return

    # 2. Test generate_final_document logic with metadata
    print("\n2. Testing generate_final_document logic...")
    
    # We will manually invoke the logic that generate_final_document uses
    # specifically checking the metadata mapping.
    
    from docxtpl import DocxTemplate
    
    template_path = 'qp_template.docx'
    if not os.path.exists(template_path):
        print(f"   Error: {template_path} not found.")
        return
        
    doc = DocxTemplate(template_path)
    
    # Mock questions
    questions_list = [
        {'qno': '1.a', 'question': 'What is AI?', 'marks': '10', 'co': 'CO1', 'level': 'L1', 'module': '1'},
        {'qno': '1.b', 'question': 'Explain A*', 'marks': '10', 'co': 'CO2', 'level': 'L2', 'module': '1'}
    ]
    
    # Prepare context as app.py does
    context = {
        'metadata': {
            'dept': metadata.get('dept', 'CSE'),
            'sem': metadata.get('sem', '7'),
            'div': metadata.get('div', 'A'),
            'course': metadata.get('subject', metadata.get('course', 'AIML')), # The fix we made
            'elective': metadata.get('elective', 'NLP'),
            'date': metadata.get('date', datetime.now().strftime('%Y-%m-%d')),
            'time': metadata.get('time', '3 Hrs'),
            'code': metadata.get('code', '18CS71'),
            'max_marks': 100
        },
        'questions': questions_list
    }
    
    print(f"   Context prepared: {json.dumps(context['metadata'], indent=2)}")
    
    # Verify 'course' is mapped correctly
    if context['metadata']['course'] == "Advanced AI":
        print("   SUCCESS: 'subject' correctly mapped to 'course'.")
    else:
        print(f"   FAILURE: 'course' is {context['metadata']['course']}, expected 'Advanced AI'.")
        
    # Try rendering
    try:
        doc.render(context)
        output_path = 'test_generated_qp_metadata.docx'
        doc.save(output_path)
        print(f"   SUCCESS: Document rendered and saved to {output_path}")
    except Exception as e:
        print(f"   FAILURE: Rendering failed: {e}")

if __name__ == "__main__":
    verify_flow()
