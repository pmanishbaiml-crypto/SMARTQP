"""
Test script to generate PDF with images using ReportLab
This is a standalone test to perfect the PDF generation before integrating into main app
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

# Sample question data with images
sample_questions = [
    {
        'qno': '1',
        'question': 'a. Write a program to search for an element in the sparse matrix',
        'marks': '8',
        'co': 'N/A',
        'level': 'L2',
        'module': '1',
        'images': []  # No images
    },
    {
        'qno': '',
        'question': 'b. Write the Fast Transpose algorithm to transpose the given Sparse Matrix. Express the given Sparse Matrix as triplets and find its transpose.',
        'marks': '10',
        'co': 'CO1',
        'level': 'L2',
        'module': '1',
        'images': ['page1_img1.jpeg']  # Has image - adjust path as needed
    },
    {
        'qno': '',
        'question': 'OR',
        'marks': '',
        'co': '',
        'level': '',
        'module': '',
        'images': []
    },
    {
        'qno': '2',
        'question': 'a. What is Data Structures? What are the various types of data structure? Explain.',
        'marks': '8',
        'co': 'N/A',
        'level': 'L2',
        'module': '1',
        'images': []
    }
]

def create_pdf_with_images(output_path, questions, images_folder='uploads/extracted_images'):
    """
    Create a PDF with questions and embedded images
    """
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=1.5*cm, leftMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm)
    
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
    
    # Header
    elements.append(Paragraph("SAHYADRI COLLEGE OF ENGINEERING & MANAGEMENT, MANGALURU", title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Questions table - SIMPLE APPROACH: Just text, images below table
    table_data = [["Q.No", "Question", "Marks", "CO", "Level", "Module"]]
    
    for q in questions:
        if q['question'] == 'OR':
            table_data.append(["OR", "", "", "", "", ""])
        else:
            # Just add text - no images in table
            table_data.append([
                q['qno'],
                Paragraph(q['question'], styles['Normal']),
                q['marks'],
                q['co'],
                q['level'],
                q['module']
            ])
    
    # Create table
    questions_table = Table(table_data, colWidths=[1*cm, 10*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.5*cm])
    
    # Style
    table_style_commands = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    ]
    
    # Add SPAN and styling for OR rows
    for i, q in enumerate(questions):
        if q['question'] == 'OR':
            table_style_commands.append(('SPAN', (0, i+1), (5, i+1)))
            table_style_commands.append(('ALIGN', (0, i+1), (0, i+1), 'CENTER'))
            table_style_commands.append(('FONTNAME', (0, i+1), (0, i+1), 'Helvetica-Bold'))
    
    questions_table.setStyle(TableStyle(table_style_commands))
    elements.append(questions_table)
    
    # Add images AFTER the table
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph("<b>Question Images:</b>", styles['Heading2']))
    elements.append(Spacer(1, 0.3*cm))
    
    for i, q in enumerate(questions):
        if q.get('images') and len(q['images']) > 0:
            for img_name in q['images']:
                img_path = os.path.join(images_folder, img_name)
                if os.path.exists(img_path):
                    try:
                        elements.append(Paragraph(f"<b>Question {q['qno'] or i+1}:</b>", styles['Normal']))
                        elements.append(Spacer(1, 0.1*cm))
                        img = Image(img_path, width=8*cm, height=6*cm, kind='proportional')
                        elements.append(img)
                        elements.append(Spacer(1, 0.3*cm))
                    except Exception as e:
                        print(f"Error loading image {img_path}: {e}")
                        elements.append(Paragraph(f"[Image error: {img_name}]", styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    print(f"✅ PDF created successfully: {output_path}")
    return output_path

if __name__ == '__main__':
    output_file = 'test_output_with_images.pdf'
    pdf_path = create_pdf_with_images(output_file, sample_questions)
    
    # Open the PDF
    import subprocess
    subprocess.run(['start', pdf_path], shell=True)
