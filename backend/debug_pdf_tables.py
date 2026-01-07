import pdfplumber
import os

pdf_path = r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\question banks\Mod-4 Question Bank.pdf"

print(f"Analyzing {pdf_path}...")

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        print(f"--- Page {i+1} ---")
        tables = page.find_tables()
        print(f"Found {len(tables)} tables.")
        for t_idx, table in enumerate(tables):
            print(f"Table {t_idx+1} BBox: {table.bbox}")
            # data = table.extract()
            # for r_idx, row in enumerate(data):
            #     # Clean row for printing
            #     clean_row = [str(cell).replace('\n', '\\n') if cell else 'None' for cell in row]
            #     
            #     # Check for specific question content
            #     if any("11." in str(c) for c in row) or any("John" in str(c) for c in row):
            #         print(f"FOUND TARGET HERE:")
            #         print(f"  Row {r_idx+1}: {clean_row}")
