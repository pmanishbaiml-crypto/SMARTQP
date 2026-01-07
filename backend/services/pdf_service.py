import os
import uuid
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_pdf_report(question_paper_data, metadata, output_path, logo_path=None, user_images_folder=None):
    """
    Generate a standardized PDF report for the question paper.
    """
    
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=1.5*cm, leftMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    # Container for PDF elements
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=14,
        textColor=colors.black,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.black,
        spaceAfter=4,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Header with logo
    if logo_path and os.path.exists(logo_path):
        # Create logo image (slightly larger)
        logo_img = Image(logo_path, width=2.5*cm, height=2.5*cm)
        
        # Create institute text paragraphs with LEFT alignment
        institute_name_style = ParagraphStyle(
            'InstituteName',
            parent=styles['Heading1'],
            fontSize=16,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT,
            spaceAfter=2
        )
        
        details_style = ParagraphStyle(
            'Details',
            parent=styles['Normal'],
            fontSize=8,
            alignment=TA_LEFT,
            spaceAfter=1
        )
        
        institute_text = []
        institute_text.append(Paragraph("SRI KRISHNA INSTITUTE OF TECHNOLOGY", institute_name_style))
        institute_text.append(Paragraph("(Accredited by NAAC, Approved by A.I.C.T.E. New Delhi, Recognised by Govt. of Karnataka & Affiliated to V.T.U., Belagavi)", details_style))
        institute_text.append(Paragraph("#57, Chimney Hills, Hesaraghatta Main Road, Chikkabanavara Post, Bengaluru- 560090", details_style))
        
        # Create header table: logo | institute details
        header_data = [[logo_img, institute_text]]
        header_table = Table(header_data, colWidths=[3*cm, 14*cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.black),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(header_table)
    else:
        # Fallback to text-only if logo not found
        elements.append(Paragraph("SRI KRISHNA INSTITUTE OF TECHNOLOGY", title_style))
        elements.append(Paragraph("(Accredited by NAAC, Approved by A.I.C.T.E. New Delhi, Recognised by Govt. of Karnataka & Affiliated to V.T.U., Belagavi)", 
                                 ParagraphStyle('Details', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, spaceAfter=2)))
        elements.append(Paragraph("#57, Chimney Hills, Hesaraghatta Main Road, Chikkabanavara Post, Bengaluru- 560090",
                                 ParagraphStyle('Address', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, spaceAfter=4)))
    
    
    # Department Name Mapping
    DEPT_FULL_NAMES = {
        'CSE': 'COMPUTER SCIENCE AND ENGINEERING',
        'ECE': 'ELECTRONICS AND COMMUNICATION ENGINEERING',
        'ME': 'MECHANICAL ENGINEERING',
        'cv': 'CIVIL ENGINEERING',
        'CV': 'CIVIL ENGINEERING',
        'EE': 'ELECTRICAL ENGINEERING',
        'EEE': 'ELECTRICAL AND ELECTRONICS ENGINEERING',
        'IT': 'INFORMATION TECHNOLOGY',
        'ISE': 'INFORMATION SCIENCE AND ENGINEERING', 
        'MBA': 'MASTER OF BUSINESS ADMINISTRATION',
        'MCA': 'MASTER OF COMPUTER APPLICATIONS',
        'AIML': 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING',
        'AIDS': 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'
    }
    
    dept_input = metadata.get('dept', 'CSE')
    # Try to get full name, otherwise use input (upper case)
    dept_name = DEPT_FULL_NAMES.get(dept_input, dept_input).upper()
    
    # Handle case where input might already be full name or close to it
    if "ENGINEERING" not in dept_name and "master" not in dept_name.lower():
         # If it's a known code not in map (unlikely) or just random text, keep as is
         pass

    elements.append(Spacer(1, 0.2*cm))
    elements.append(Paragraph(f"Department of {dept_name}", subtitle_style))
    elements.append(Paragraph("CIE - I", subtitle_style))
    elements.append(Spacer(1, 0.3*cm))
    
    # Metadata table
    overall_max_marks = metadata.get('max_marks', 100)
    meta_data = [
        [f"Date: {metadata.get('date', '')}", f"Time: {metadata.get('time', '')}", 
         f"Max Marks: {overall_max_marks}", f"Sem/Div: {metadata.get('sem', '')}/{metadata.get('div', '')}"],
        [f"Course: {metadata.get('subject', metadata.get('course', ''))}", 
         f"Code: {metadata.get('code', '')}", 
         f"Elective: {metadata.get('elective', 'N/A')}", ""]
    ]
    
    meta_table = Table(meta_data, colWidths=[4.5*cm, 4*cm, 4*cm, 4*cm])
    meta_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('SPAN', (2, 1), (3, 1)),  # Merge last two cells in row 2
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.3*cm))
    
    # Note
    note_style = ParagraphStyle('Note', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold')
    elements.append(Paragraph("Note: Answer any ONE full question from each module.", note_style))
    elements.append(Spacer(1, 0.2*cm))
    
    # Flatten question data
    questions_list = []
    
    for main_q_idx, main_q_data in enumerate(question_paper_data):
        # Insert OR row for CIE 1 pattern (before Q2 and Q4)
        if main_q_idx == 1 or main_q_idx == 3:
            questions_list.append({
                'qno': '',
                'question': 'OR',
                'marks': '',
                'co': '',
                'level': '',
                'module': '',
                'images': []
            })
            
        # Handle both camelCase and snake_case for compatibility
        sub_questions = main_q_data.get('subQuestions', main_q_data.get('sub_questions', []))
        for sub_q_idx, sub_q_data in enumerate(sub_questions):
            
            # Format Q.No (e.g., 1.a)
            qno = ""
            if sub_q_idx == 0:
                qno = str(main_q_idx + 1)
            
            sub_letter = chr(97 + sub_q_idx)
            question_text = sub_q_data.get('question_text', sub_q_data.get('text', ''))
            
            # Store images
            images = sub_q_data.get('images', [])
            
            questions_list.append({
                'qno': qno,
                'question': f"{sub_letter}. {question_text}",
                'marks': sub_q_data.get('marks', ''),
                'co': sub_q_data.get('co', ''),
                'level': sub_q_data.get('blooms_level', sub_q_data.get('level', '')),
                'module': sub_q_data.get('module', ''),
                'images': images
            })

    # Questions table - with images INLINE in question cells
    table_data = [["Q.No", "Question", "CO", "Level", "Marks", "Module"]]
    
    for q in questions_list:
        if q['question'] == 'OR':
            # OR row - will be merged later
            table_data.append(["OR", "", "", "", "", ""])
        else:
            # Normal question row - create nested content for question cell
            question_cell_content = []
            
            # Add question text
            question_cell_content.append(Paragraph(str(q['question']), styles['Normal']))
            
            # Add images inline if present
            if q.get('images') and len(q['images']) > 0 and user_images_folder:
                for img_name in q['images']:
                    # Resolve path
                    if not os.path.isabs(img_name):
                        full_img_path = os.path.join(user_images_folder, img_name)
                    else:
                        full_img_path = img_name
                        
                    if os.path.exists(full_img_path):
                        try:
                            # Add small spacer before image
                            question_cell_content.append(Spacer(1, 0.1*cm))
                            # Add image (smaller size for inline display)
                            img = Image(full_img_path, width=4*cm, height=3*cm, kind='proportional')
                            question_cell_content.append(img)
                        except Exception as e:
                            print(f"Error loading image {full_img_path}: {e}")
            
            # Create a nested single-column table to hold the content
            nested_table = Table([[item] for item in question_cell_content], colWidths=[11.5*cm])
            nested_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            
            table_data.append([
                str(q['qno']),
                nested_table,  # Use nested table instead of plain Paragraph
                str(q['co']),
                str(q['level']),
                str(q['marks']),
                str(q['module'])
            ])
    
    # Adjusted column widths: Q.No, Question, CO, Level, Marks, Module
    questions_table = Table(table_data, colWidths=[1.2*cm, 11.5*cm, 1.2*cm, 1.2*cm, 1.2*cm, 1.2*cm])
    
    # Build table style
    table_style_commands = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Header row
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),  # Header alignment
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Q.No column
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),  # Marks, CO, Level, Module columns
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    ]
    
    # Add SPAN for OR rows
    for i, q in enumerate(questions_list):
        if q['question'] == 'OR':
            table_style_commands.append(('SPAN', (0, i+1), (5, i+1)))
            table_style_commands.append(('ALIGN', (0, i+1), (0, i+1), 'CENTER'))
            table_style_commands.append(('FONTNAME', (0, i+1), (0, i+1), 'Helvetica-Bold'))
            table_style_commands.append(('FONTSIZE', (0, i+1), (0, i+1), 11))
    
    questions_table.setStyle(TableStyle(table_style_commands))
    elements.append(questions_table)
    
    # Build PDF
    doc.build(elements)
    return output_path
