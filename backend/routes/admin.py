from flask import Blueprint, request, jsonify, render_template, current_app, send_file
import firebase_admin
from firebase_admin import firestore, auth
from supabase_service import supabase_service
import os
import traceback
from utils import firebase_auth_required

admin_bp = Blueprint('admin', __name__)
db_firestore = firestore.client()

TEST_BANKS_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../question banks'))

@admin_bp.route('/create_hod_user', methods=['POST'])
def create_hod_user():
    """Create HOD user for testing"""
    try:
        firebase_uid = 'jaQrJOvNfxO4eN5sqKoiNkmlixg2'
        email = 'test_hod@example.com'
        
        # Check if user already exists
        existing_user = supabase_service.get_user_by_firebase_uid(firebase_uid)
        if existing_user:
            if existing_user.get('role') != 'hod':
                # Update role to hod
                supabase_service.supabase.table('users')\
                    .update({'role': 'hod'})\
                    .eq('id', existing_user['id'])\
                    .execute()
                return jsonify({'message': 'User role updated to HOD'}), 200
            else:
                return jsonify({'message': 'User already has HOD role'}), 200
        
        # Create new HOD user
        user_data = {
            'firebase_uid': firebase_uid,
            'email': email,
            'name': 'Test HOD',
            'role': 'hod',
            'department': 'Computer Science'
        }
        
        result = supabase_service.supabase.table('users').insert(user_data).execute()
        
        if result.data:
            return jsonify({'message': 'HOD user created successfully', 'user': result.data[0]}), 200
        else:
            return jsonify({'error': 'Failed to create HOD user'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Error creating HOD user: {str(e)}'}), 500

@admin_bp.route('/test_parser')
def test_parser_page():
    return render_template('test_parser.html')

@admin_bp.route('/api/test/list_banks')
def list_test_banks():
    try:
        if not os.path.exists(TEST_BANKS_FOLDER):
            return jsonify({'error': f'Folder not found: {TEST_BANKS_FOLDER}'}), 404
            
        files = [f for f in os.listdir(TEST_BANKS_FOLDER) if f.lower().endswith('.pdf')]
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/get_pending_approvals', methods=['GET'])
@firebase_auth_required
def get_pending_approvals():
    """Get papers pending approval for HOD"""
    user_uid = request.current_user_uid
    
    try:
        # Check if user is HOD using Supabase
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({"error": "Access denied. HOD privileges required."}), 403
        
        # Get ALL approvals (pending, approved, rejected) from Supabase
        # Optimize: Select only necessary fields. 
        # Crucially, we do NOT select 'questions' to reduce payload size.
        # We also select specific user fields.
        approvals_result = supabase_service.supabase.table('approvals')\
            .select('*, saved_question_papers(id, paper_name, subject, pattern, total_marks, status), users:users!approvals_submitted_by_fkey(name, email, department)')\
            .order('submitted_at', desc=True)\
            .execute()
            
        approvals = approvals_result.data if approvals_result.data else []
        
        # Filter by department
        department_approvals = []
        hod_dept = (hod_user.get('department') or '').lower()
        
        for approval in approvals:
            faculty = approval.get('users')
            if not faculty: continue # Skip if user not found
            
            faculty_dept = (faculty.get('department') or '').lower()
            
            # Simple containment check for department matching
            if hod_dept and hod_dept in faculty_dept:
                department_approvals.append(approval)
        
        # Format approvals for frontend
        formatted_approvals = []
        for approval in department_approvals:
            paper = approval.get('saved_question_papers', {})
            if not paper: continue # Skip if paper not found
            
            faculty = approval.get('users', {})
            
            formatted_approval = {
                'id': approval['id'],
                'paper_id': approval['paper_id'],
                'faculty_uid': approval['submitted_by'],
                'faculty_name': faculty.get('name', 'Unknown Faculty'),
                'faculty_email': faculty.get('email', ''),
                'department': faculty.get('department', 'Unknown Department'),
                'subject': paper.get('subject', 'Unknown Subject'),
                'paper_name': paper.get('paper_name', 'Untitled Paper'),
                'questions': [], # Empty for list view, viewPaper will fetch details if needed or use separate endpoint
                'pattern': paper.get('pattern', 'standard'),
                'total_marks': paper.get('total_marks', 100),
                'status': approval['status'],
                'comments': approval.get('comments', ''),
                'hod_comments': approval.get('hod_comments', ''),
                'submitted_at': approval.get('submitted_at'),
                'reviewed_at': approval.get('reviewed_at'),
                'priority': 'medium',
                'estimated_review_time': '2-3 days'
            }
            formatted_approvals.append(formatted_approval)
        
        return jsonify({
            "approvals": formatted_approvals,
            "department": hod_user.get('department', 'Unknown Department')
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching pending approvals: {str(e)}"}), 500

@admin_bp.route('/get_approval_details/<approval_id>', methods=['GET'])
@firebase_auth_required
def get_approval_details(approval_id):
    """Get full details for a specific approval (including questions)"""
    user_uid = request.current_user_uid
    
    try:
        # Check HOD access
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({"error": "Access denied"}), 403
            
        # Get approval with FULL details
        approval_result = supabase_service.supabase.table('approvals')\
            .select('*, saved_question_papers(*), users:users!approvals_submitted_by_fkey(*)')\
            .eq('id', approval_id)\
            .execute()
            
        if not approval_result.data:
            return jsonify({"error": "Approval not found"}), 404
            
        approval = approval_result.data[0]
        paper = approval.get('saved_question_papers', {})
        faculty = approval.get('users', {})
        
        formatted_approval = {
            'id': approval['id'],
            'paper_id': approval['paper_id'],
            'faculty_uid': approval['submitted_by'],
            'faculty_name': faculty.get('name', 'Unknown Faculty'),
            'faculty_email': faculty.get('email', ''),
            'department': faculty.get('department', 'Unknown Department'),
            'subject': paper.get('subject', 'Unknown Subject'),
            'paper_name': paper.get('paper_name', 'Untitled Paper'),
            'questions': paper.get('questions', []), # Full questions here
            'pattern': paper.get('pattern', 'standard'),
            'total_marks': paper.get('total_marks', 100),
            'status': approval['status'],
            'comments': approval.get('comments', ''),
            'hod_comments': approval.get('hod_comments', ''),
            'submitted_at': approval.get('submitted_at'),
            'reviewed_at': approval.get('reviewed_at'),
            'priority': 'medium'
        }
        
        return jsonify(formatted_approval), 200
        
    except Exception as e:
        print(f"Error fetching approval details: {e}")
        return jsonify({"error": str(e)}), 500
        
    except Exception as e:
        return jsonify({"error": f"Error fetching pending approvals: {str(e)}"}), 500

@admin_bp.route('/approve_paper', methods=['POST'])
@firebase_auth_required
def approve_paper():
    """Approve a question paper"""
    user_uid = request.current_user_uid
    data = request.get_json()
    approval_id = data.get('approval_id')
    comments = data.get('comments', '')
    
    try:
        # Check if user is HOD using Supabase
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({"error": "Access denied. HOD privileges required."}), 403
        
        # Approve paper using Supabase service
        success = supabase_service.approve_paper(approval_id, hod_user['id'], comments)
        
        if success:
            return jsonify({
                "message": "Question paper approved successfully!",
                "status": "approved"
            }), 200
        else:
            return jsonify({"error": "Failed to approve paper"}), 500
        
    except Exception as e:
        return jsonify({"error": f"Failed to approve paper: {str(e)}"}), 500

@admin_bp.route('/request_revision', methods=['POST'])
@firebase_auth_required
def request_revision():
    """Request revision for a question paper"""
    user_uid = request.current_user_uid
    data = request.get_json()
    approval_id = data.get('approval_id')
    comments = data.get('comments', '')
    revision_type = data.get('revision_type', 'minor')  # minor, major, complete_rewrite
    
    try:
        # Check if user is HOD using Supabase
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({"error": "Access denied. HOD privileges required."}), 403
        
        # Reject paper using Supabase service (treating revision as rejection with comments)
        success = supabase_service.reject_paper(approval_id, hod_user['id'], f"Revision requested: {comments}")
        
        if success:
            return jsonify({
                "message": "Revision requested successfully!",
                "status": "revision_requested",
                "revision_type": revision_type
            }), 200
        else:
            return jsonify({"error": "Failed to request revision"}), 500
        
    except Exception as e:
        return jsonify({"error": f"Failed to request revision: {str(e)}"}), 500

@admin_bp.route('/api/test/parse_bank', methods=['POST'])
def parse_test_bank():
    try:
        data = request.json
        filename = data.get('filename')
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
            
        filepath = os.path.join(TEST_BANKS_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
            
        # Use Advanced Parser
        # Note: The user requested to use the advanced parser from app_backup/advanced_parser.py
        # We need to import it from the backend root or move it to services. 
        # Since it's in backend/, we can import it directly if backend is in path, 
        # or relative import if we are in routes.
        
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__))) # Add backend to path
        from advanced_parser import get_advanced_parser
        
        parser = get_advanced_parser()
        
        # Output images to the same extracted_images folder so they can be served
        images_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), "extracted_images")
        os.makedirs(images_folder, exist_ok=True)
        
        # Parse
        raw_parsed_content = parser.parse_pdf(filepath, images_folder)
        
        # Normalize image paths for serving
        for item in raw_parsed_content:
            images = item.get("images", [])
            item["images"] = [img.replace('\\', '/').split('/')[-1] for img in images]
            # Note: We just keep the filename because serve_extracted_image serves from 'extracted_images' root
            
        return jsonify({'status': 'success', 'data': raw_parsed_content})
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/register_faculty', methods=['POST'])
@firebase_auth_required
def register_faculty():
    """Register a new faculty member under the HOD's department"""
    user_uid = request.current_user_uid
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400
        
    try:
        # Check if requester is HOD
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({'error': 'Access denied. HOD privileges required.'}), 403
            
        department = hod_user.get('department')
        if not department:
            return jsonify({'error': 'HOD department not found. Please update your profile.'}), 400
            
        # Create user in Firebase
        try:
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
        except auth.EmailAlreadyExistsError:
            return jsonify({'error': 'Email already exists'}), 400
        except Exception as e:
            return jsonify({'error': f'Firebase error: {str(e)}'}), 500
            
        # Set custom claims (optional, but good for security rules)
        auth.set_custom_user_claims(user_record.uid, {'role': 'faculty'})
        
        # Create user in Supabase
        supabase_user = supabase_service.create_user(
            firebase_uid=user_record.uid,
            email=email,
            name=name,
            role='faculty',
            department=department
        )
        
        if supabase_user:
            return jsonify({
                'message': 'Faculty registered successfully',
                'user': supabase_user
            }), 201
        else:
            # Rollback Firebase user creation if Supabase fails (optional but recommended)
            try:
                auth.delete_user(user_record.uid)
            except:
                pass
            return jsonify({'error': 'Failed to create user profile'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/get_department_faculty', methods=['GET'])
@firebase_auth_required
def get_department_faculty():
    """Get all faculty members in the HOD's department"""
    user_uid = request.current_user_uid
    
    try:
        # Check if requester is HOD
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({'error': 'Access denied. HOD privileges required.'}), 403
            
        department = hod_user.get('department')
        print(f"DEBUG: HOD Department: {department}")
        if not department:
            return jsonify({'faculty': []}), 200
            
        # Fetch faculty from Supabase
        # We need to query the users table for role='faculty' and department=department
        result = supabase_service.supabase.table('users')\
            .select('*')\
            .eq('role', 'faculty')\
            .ilike('department', f'%{department}%')\
            .execute()
            
        faculty_list = result.data if result.data else []
        print(f"DEBUG: Found {len(faculty_list)} faculty members for department query '%{department}%'")
        
        # Add some stats for each faculty (optional)
        for faculty in faculty_list:
            # Count papers
            papers_count = supabase_service.supabase.table('saved_question_papers')\
                .select('id', count='exact')\
                .eq('user_id', faculty['id'])\
                .execute()
            faculty['papers_count'] = papers_count.count
            
        return jsonify({'faculty': faculty_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- PDF Generation Helper ---
# We now use the shared service
import sys
# Ensure backend is in path to import services
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.pdf_service import generate_pdf_report
from datetime import datetime

@admin_bp.route('/generate_approval_pdf/<approval_id>', methods=['GET'])
@firebase_auth_required
def generate_approval_pdf(approval_id):
    """Generate and return PDF for a specific approval using the standard template"""
    user_uid = request.current_user_uid
    
    try:
        # Check HOD access
        hod_user = supabase_service.get_user_by_firebase_uid(user_uid)
        if not hod_user or hod_user.get('role') != 'hod':
            return jsonify({"error": "Access denied"}), 403
            
        # Get approval details with faculty info
        # We need to specify the relationship for users because there are two FKs (submitted_by, reviewed_by)
        # We want the submitter (faculty)
        approval_result = supabase_service.supabase.table('approvals')\
            .select('*, saved_question_papers(*), users:users!approvals_submitted_by_fkey(*)')\
            .eq('id', approval_id)\
            .execute()
            
        if not approval_result.data:
            return jsonify({"error": "Approval not found"}), 404
            
        approval = approval_result.data[0]
        paper = approval.get('saved_question_papers', {})
        faculty = approval.get('users', {})
        
        if not paper:
            return jsonify({"error": "Paper data not found"}), 404
            
        questions = paper.get('questions', [])
        subject = paper.get('subject', 'Untitled')
        paper_id = paper.get('id', 'Unknown')
        
        # Prepare metadata for the template
        metadata = paper.get('metadata', {})
        # Ensure essential fields are present
        metadata['subject'] = subject
        metadata['dept'] = faculty.get('department', 'Unknown Dept')
        metadata['date'] = datetime.now().strftime("%d-%m-%Y") # Or paper date
        
        # Paths
        logo_path = os.path.join(current_app.static_folder, 'assets', 'logo.jpg')
        
        # Faculty images folder
        faculty_firebase_uid = faculty.get('firebase_uid')
        user_images_folder = None
        if faculty_firebase_uid:
            user_images_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], faculty_firebase_uid, 'extracted_images')
            
        # Output path
        filename = f"{subject.replace(' ', '_')}_{paper_id}_HOD.pdf"
        pdf_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        
        # Generate PDF using the service
        generate_pdf_report(questions, metadata, pdf_path, logo_path, user_images_folder)
        
        return send_file(
            pdf_path,
            as_attachment=False, # View in browser
            download_name=f"{subject}_{paper_id}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
