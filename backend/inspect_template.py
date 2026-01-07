import os
from docxtpl import DocxTemplate

def inspect_template():
    template_path = os.path.abspath('qp_template.docx')
    if not os.path.exists(template_path):
        print("Template not found.")
        return

    doc = DocxTemplate(template_path)
    print("Template variables:")
    print(doc.get_undeclared_template_variables())

if __name__ == "__main__":
    inspect_template()
