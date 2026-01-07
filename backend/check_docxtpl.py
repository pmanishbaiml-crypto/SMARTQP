try:
    from docxtpl import DocxTemplate
    import os
    print("docxtpl is installed.")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(base_dir, 'qp_template.docx')
    
    if os.path.exists(template_path):
        print(f"Template found at {template_path}")
        try:
            doc = DocxTemplate(template_path)
            print("Template loaded successfully.")
        except Exception as e:
            print(f"Failed to load template: {e}")
    else:
        print(f"Template NOT found at {template_path}")
        
except ImportError:
    print("docxtpl is NOT installed.")
