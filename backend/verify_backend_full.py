import sys
import os

print(f"Python Executable: {sys.executable}")

try:
    from docxtpl import DocxTemplate
    print(f"✅ docxtpl imported successfully from: {sys.modules['docxtpl'].__file__}")
except ImportError as e:
    print(f"❌ Failed to import docxtpl: {e}")
    sys.exit(1)

base_dir = os.path.dirname(os.path.abspath(__file__))
template_path = os.path.join(base_dir, 'qp_template.docx')

if os.path.exists(template_path):
    print(f"✅ Template found at: {template_path}")
    try:
        doc = DocxTemplate(template_path)
        print("✅ Template loaded successfully into DocxTemplate")
    except Exception as e:
        print(f"❌ Failed to load template: {e}")
else:
    print(f"❌ Template NOT found at: {template_path}")
