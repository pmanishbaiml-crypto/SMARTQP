import sys
import os
import json

# Add backend directory to path
sys.path.append(os.path.abspath(r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend"))

from advanced_parser import get_advanced_parser

def verify_mod1_q15():
    parser = get_advanced_parser()
    pdf_path = r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\question banks\Module-1 Question Bank[1].pdf"
    output_folder = r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend\extracted_images"
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    print(f"Parsing {pdf_path}...")
    results = parser.parse_pdf(pdf_path, output_folder)
    
    print(f"Parsed {len(results)} questions.")
    
    found_q15 = False
    for q in results:
        if q.get('sl_no') == '15' or q.get('sl_no') == 15:
            print("\n--- Found Question 15 ---")
            print(f"Text: {q['text']}")
            
            # Check for expected content that was previously truncated
            # (I don't have the exact expected text, but I can check length or look for specific keywords if I knew them)
            # For now, I'll just print it for manual verification in the output.
            
            if len(q['text']) > 50: # Assuming a real question is longer than 50 chars
                 print("SUCCESS: Question 15 text length seems reasonable.")
            else:
                 print("WARNING: Question 15 text seems very short.")
            
            found_q15 = True
            break
            
    if not found_q15:
        print("Question 15 not found in parsed results.")

if __name__ == "__main__":
    verify_mod1_q15()
