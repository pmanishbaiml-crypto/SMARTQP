import zipfile
import re
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
template_path = os.path.join(base_dir, 'qp_template.docx')

if os.path.exists(template_path):
    try:
        with zipfile.ZipFile(template_path, 'r') as z:
            xml_content = z.read('word/document.xml').decode('utf-8')
            
            # Simple search for Jinja2 tags
            tags = re.findall(r'\{\{.*?\}\}', xml_content)
            print(f"Found {len(tags)} potential tags:")
            for t in tags:
                print(f"  {t}")
                
            # Also check for loop tags
            loops = re.findall(r'\{%.*?%\}', xml_content)
            print(f"Found {len(loops)} potential loop tags:")
            for l in loops:
                print(f"  {l}")
                
    except Exception as e:
        print(f"Error reading DOCX: {e}")
else:
    print("Template not found.")
