import sys
import os
import json

# Add backend directory to path
sys.path.append(os.path.abspath(r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend"))

from advanced_parser import get_advanced_parser

def verify_parsing():
    parser = get_advanced_parser()
    pdf_path = r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\question banks\Mod-4 Question Bank.pdf"
    output_folder = r"d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend\extracted_images"
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    print(f"Parsing {pdf_path}...")
    results = parser.parse_pdf(pdf_path, output_folder)
    
    print(f"Parsed {len(results)} questions.")
    
    found_q11 = False
    for q in results:
        # Check for Question 11 specifically (nested table test)
        if q.get('sl_no') == '11' or q.get('sl_no') == 11:
            print("\n--- Found Question 11 ---")
            print(f"Text: {q['text'][:200]}...")
            print(f"Images: {q.get('images', [])}")
            
            if "Table:" in q['text']:
                print("SUCCESS: 'Table:' marker found in Question 11 text (Nested Table Fix Verified).")
            else:
                print("FAILURE: 'Table:' marker NOT found in Question 11 text.")
            found_q11 = True
        
        # Check for images in general
        if q.get('images'):
             print(f"Question {q.get('sl_no')} has images: {q['images']}")

    if not found_q11:
        print("Question 11 not found in parsed results.")

if __name__ == "__main__":
    verify_parsing()
