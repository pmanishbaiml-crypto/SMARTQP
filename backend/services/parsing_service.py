import pdfplumber
import docx
import traceback
import re
from services.formatting_service import clean_text, extract_marks_from_text, format_question_with_tables, extract_table_as_text

def parse_pdf_question_bank(filepath):
    """
    Parses a PDF question bank, attempting to extract questions from tables.
    Assumes a table structure for questions (SL#, Question, CO, Level, Marks).
    Math equations will be extracted as raw text.
    """
    extracted_questions = []
    
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() 
                
                for table in tables:
                    for row_index, row in enumerate(table):
                        if row_index == 0: # Skip header row
                            continue
                        
                        if len(row) >= 6:
                            # Handle 6-column format: Q.No, Questions, CO, Level, Marks, Module
                            sl_no = clean_text(row[0])
                            question_text = clean_text(row[1])
                            co = clean_text(row[2])
                            blooms_level = clean_text(row[3])
                            marks_text = clean_text(row[4])
                            module = clean_text(row[5])

                            # Use enhanced marks extraction
                            marks = extract_marks_from_text(marks_text)

                            if question_text:
                                extracted_questions.append({
                                    "sl_no": sl_no,
                                    "question_text": question_text,
                                    "co": co,
                                    "blooms_level": blooms_level,
                                    "marks": marks,
                                    "module": module
                                })
                        elif len(row) >= 5:
                            # Handle 5-column format (legacy): Q.No, Questions, CO, Level, Marks
                            sl_no = clean_text(row[0])
                            question_text = clean_text(row[1])
                            co = clean_text(row[2])
                            blooms_level = clean_text(row[3])
                            marks_text = clean_text(row[4])

                            # Use enhanced marks extraction
                            marks = extract_marks_from_text(marks_text)

                            if question_text:
                                extracted_questions.append({
                                    "sl_no": sl_no,
                                    "question_text": question_text,
                                    "co": co,
                                    "blooms_level": blooms_level,
                                    "marks": marks,
                                    "module": "1"  # Default to module 1 for legacy format
                                })
                        else:
                            # print(f"Skipping malformed PDF row due to insufficient columns: {row}") # Debugging
                            pass
    except Exception as e:
        print(f"Error during PDF parsing of {filepath}: {e}")
        traceback.print_exc() # Print full traceback for debugging
        # Don't raise here, allow fallback to other parsers
    
    return extracted_questions

def parse_docx_question_bank(filepath):
    """
    Parses a DOCX question bank, attempting to extract questions from tables.
    Assumes a table structure similar to PDF (SL#, Question, CO, Level, Marks).
    Math equations will be extracted as raw text.
    """
    extracted_questions = []
    try:
        doc = docx.Document(filepath)

        for table in doc.tables:
            for row_index, row in enumerate(table.rows):
                cells = [clean_text(cell.text) for cell in row.cells]
                
                # Skip empty rows
                if not any(cells):
                    continue
                
                # Check if this is a header row (contains common header words)
                header_words = ['q.no', 'question', 'co', 'level', 'marks', 'module', 'sl', 's.no']
                is_header = any(word in ' '.join(cells).lower() for word in header_words)
                
                if is_header and row_index == 0:
                    continue  # Skip header row
                
                if len(cells) >= 6:
                    # Handle 6-column format: Q.No, Questions, CO, Level, Marks, Module
                    sl_no = cells[0] if cells[0].strip() else f"Q{len(extracted_questions) + 1}"
                    question_text = cells[1]
                    co = cells[2]
                    blooms_level = cells[3]
                    marks_text = cells[4]
                    module = cells[5]

                    # Extract marks using the helper function
                    marks = extract_marks_from_text(marks_text)

                    if question_text and question_text.strip():
                        extracted_questions.append({
                            "sl_no": sl_no,
                            "question_text": format_question_with_tables(question_text),
                            "co": co,
                            "blooms_level": blooms_level,
                            "marks": marks,
                            "module": module
                        })
                elif len(cells) >= 5:
                    # Handle 5-column format: SL#, Questions, CO, Level, Marks
                    sl_no = cells[0] if cells[0].strip() else f"Q{len(extracted_questions) + 1}"
                    question_text = cells[1]
                    co = cells[2]
                    blooms_level = cells[3]
                    marks_text = cells[4]

                    # Extract marks using the helper function
                    marks = extract_marks_from_text(marks_text)

                    if question_text and question_text.strip():
                        extracted_questions.append({
                            "sl_no": sl_no,
                            "question_text": format_question_with_tables(question_text),
                            "co": co,
                            "blooms_level": blooms_level,
                            "marks": marks,
                            "module": "1"  # Default to module 1 for legacy format
                        })
                elif len(cells) >= 4:
                    # Handle 4-column format: Q.No, Questions, CO, Level (no marks)
                    sl_no = cells[0] if cells[0].strip() else f"Q{len(extracted_questions) + 1}"
                    question_text = cells[1]
                    co = cells[2]
                    blooms_level = cells[3]

                    if question_text and question_text.strip():
                        extracted_questions.append({
                            "sl_no": sl_no,
                            "question_text": format_question_with_tables(question_text),
                            "co": co,
                            "blooms_level": blooms_level,
                            "marks": 0,  # Default marks
                            "module": "1"  # Default module
                        })
    except Exception as e:
        print(f"Error during DOCX parsing of {filepath}: {e}")
        traceback.print_exc() # Print full traceback for debugging
        raise # Re-raise to be caught by the route's error handling
    return extracted_questions

def parse_pdf_with_embedded_tables(filepath):
    """
    Universal PDF parser that can handle any type of question bank format.
    This function uses multiple strategies to extract questions from various PDF structures.
    """
    extracted_questions = []
    
    # Check if file exists
    import os
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        return extracted_questions
    
    try:
        with pdfplumber.open(filepath) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract all tables from the page
                tables = page.extract_tables()
                page_text = page.extract_text() or ""
                
                print(f"Page {page_num + 1}: Found {len(tables)} tables and {len(page_text)} characters of text")
                
                # Strategy 1: Process structured question bank tables
                structured_questions = process_structured_tables(tables, page_num + 1)
                extracted_questions.extend(structured_questions)
                
                # Strategy 2: Extract questions from plain text (fallback)
                text_questions = extract_questions_from_plain_text(page_text)
                print(f"Extracted {len(text_questions)} questions from plain text")
                
                # Remove duplicates from text questions (in case they were already extracted from tables)
                existing_sl_nos = {q.get('sl_no', '') for q in extracted_questions}
                unique_text_questions = [q for q in text_questions if q.get('sl_no', '') not in existing_sl_nos]
                extracted_questions.extend(unique_text_questions)
                
                # Strategy 3: Process embedded tables as potential questions
                embedded_questions = process_embedded_tables(tables, page_text, page_num + 1)
                extracted_questions.extend(embedded_questions)
    
    except Exception as e:
        print(f"Error parsing PDF with embedded tables: {e}")
        traceback.print_exc()
    
    print(f"Total questions extracted: {len(extracted_questions)}")
    return extracted_questions

def process_structured_tables(tables, page_num):
    """Process tables that are structured question banks"""
    questions = []
    
    for table_idx, table in enumerate(tables):
        if not table or len(table) < 2:
            continue
        
        # Check if this is a question bank table (multiple detection methods)
        header_row = table[0]
        is_question_bank = detect_question_bank_table(header_row, table)
        
        if is_question_bank:
            print("Found structured question bank table")
            table_questions = extract_questions_from_structured_table(table)
            questions.extend(table_questions)
    
    return questions

def detect_question_bank_table(header_row, table):
    """Detect if a table is a question bank using multiple criteria"""
    if not header_row:
        return False
    
    # Method 1: Standard question bank headers
    if any(header for header in header_row if header and ("Q.No" in str(header) or "Question" in str(header) or "SL" in str(header))):
        return True
    
    # Method 2: Numeric question numbers in first column with CO/Level indicators
    if (len(header_row) >= 4 and str(header_row[0]).strip().isdigit() and 
        any(str(cell).strip() in ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'L1', 'L2', 'L3', 'L4', 'L5'] for cell in header_row[2:4] if cell)):
        return True
    
    # Method 3: Check if multiple rows have question-like structure
    if len(table) >= 3:
        question_like_rows = 0
        for row in table[:3]:  # Check first 3 rows
            if (len(row) >= 4 and str(row[0]).strip().isdigit() and 
                len(str(row[1]).strip()) > 20):  # Question text is substantial
                question_like_rows += 1
        
        if question_like_rows >= 2:  # At least 2 rows look like questions
            return True
    
    # Method 4: Check for marks patterns (6M, 8M, etc.)
    if any(str(cell).strip().endswith('M') for row in table[:3] for cell in row if cell):
        return True
    
    return False

def extract_questions_from_structured_table(table):
    """Extract questions from a structured table"""
    questions = []
    
    # Check if the first row is also a question (not just headers)
    if (len(table[0]) >= 4 and str(table[0][0]).strip().isdigit() and 
        any(str(cell).strip() in ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'L1', 'L2', 'L3', 'L4', 'L5'] for cell in table[0][2:4] if cell)):
        # First row is also a question, process it
        question = extract_question_from_row(table[0])
        if question:
            questions.append(question)
    
    # Process remaining rows
    for row_index, row in enumerate(table[1:], 1):
        question = extract_question_from_row(row)
        if question:
            questions.append(question)
    
    return questions

def extract_question_from_row(row):
    """Extract question data from a table row"""
    if len(row) < 4:
        return None
    
    sl_no = clean_text(row[0]) if len(row) > 0 else ""
    question_text = clean_text(row[1]) if len(row) > 1 else ""
    co = clean_text(row[2]) if len(row) > 2 else "CO1"
    blooms_level = clean_text(row[3]) if len(row) > 3 else "L1"
    marks_text = clean_text(row[4]) if len(row) > 4 else "5"
    module = clean_text(row[5]) if len(row) > 5 else "1"

    marks = extract_marks_from_text(marks_text)

    if question_text and sl_no:
        # Check if question text contains table data and format it properly
        formatted_question = format_question_with_tables(question_text)
        
        return {
            "sl_no": sl_no,
            "question_text": formatted_question,
            "co": co,
            "blooms_level": blooms_level,
            "marks": marks,
            "module": module
        }
    
    return None

def process_embedded_tables(tables, page_text, page_num):
    """Process embedded tables that might contain questions"""
    questions = []
    
    for table_idx, table in enumerate(tables):
        if not table or len(table) < 2:
            continue
        
        # Skip if this was already processed as a structured table
        if detect_question_bank_table(table[0], table):
            continue
        
        # Try to find question context around this table
        table_text = extract_table_as_text(table)
        if table_text:
            question_context = find_question_context_in_text(page_text, table_text)
            if question_context:
                questions.append(question_context)
            else:
                # Only create generic entries for very substantial tables with meaningful data
                if len(table) >= 5 and len(table_text) > 100:  # More selective criteria
                    # Check if table contains question-like content
                    table_content = ' '.join(table_text.split()[:20]).lower()  # First 20 words
                    question_indicators = ['classify', 'analyze', 'calculate', 'explain', 'compare', 'evaluate', 'design', 'implement']
                    
                    if any(indicator in table_content for indicator in question_indicators):
                        questions.append({
                            "sl_no": f"T{page_num}_{table_idx + 1}",
                            "question_text": f"Question with table data:\n\nTable:\n{table_text}",
                            "co": "CO1",
                            "blooms_level": "L1",
                            "marks": 5,
                            "module": "1"
                        })
    
    return questions

def find_question_context_in_text(page_text, table_text):
    """Find question context around a table in the page text"""
    if not page_text or not table_text:
        return None
    
    lines = page_text.split('\n')
    table_lines = [line.strip() for line in table_text.split('\n') if line.strip()]
    
    # Find where the table appears in the text
    for i, line in enumerate(lines):
        if any(table_line in line for table_line in table_lines[:3]):  # Check first few table lines
            # Found the table, look backwards for question context
            question_text = ""
            for j in range(max(0, i-15), i):  # Look at 15 lines before the table
                if lines[j].strip():
                    question_text += lines[j] + " "
            
            if question_text.strip():
                # Extract question details
                q_match = re.search(r'Q\.?\s*(\d+)\.?\s*(.*)', question_text, re.IGNORECASE)
                if q_match:
                    q_num = q_match.group(1)
                    q_text = q_match.group(2).strip()
                    
                    # Extract marks, CO, and level
                    marks = extract_marks_from_text(q_text)
                    if marks == 0:
                        marks = 5  # Default
                    
                    co_match = re.search(r'CO\s*(\d+)', q_text, re.IGNORECASE)
                    co = co_match.group(0) if co_match else "CO1"
                    
                    level_match = re.search(r'L\s*(\d+)', q_text, re.IGNORECASE)
                    level = level_match.group(0) if level_match else "L1"
                    
                    # Combine question text with table - ensure proper formatting
                    if table_text.strip():
                        full_question = q_text + "\n\nTable:\n" + table_text
                    else:
                        full_question = q_text
                    
                    return {
                        "sl_no": q_num,
                        "question_text": clean_text(full_question),
                        "co": co,
                        "blooms_level": level,
                        "marks": marks,
                        "module": "1"
                    }
    
    return None

def extract_questions_from_plain_text(text_content):
    """Extract questions from plain text using various patterns"""
    questions = []
    
    if not text_content:
        return questions
    
    # Pattern 1: Q.1, Q.2, etc.
    pattern1 = re.findall(r'Q\.?\s*(\d+)\.?\s*(.*?)(?=Q\.?\s*\d+\.?\s*|$)', text_content, re.DOTALL | re.IGNORECASE)
    for q_num, q_text in pattern1:
        if q_text.strip():
            marks = extract_marks_from_text(q_text)
            co_match = re.search(r'CO\s*(\d+)', q_text, re.IGNORECASE)
            co = co_match.group(0) if co_match else "CO1"
            
            level_match = re.search(r'L\s*(\d+)', q_text, re.IGNORECASE)
            level = level_match.group(0) if level_match else "L1"
            
            questions.append({
                "sl_no": q_num,
                "question_text": clean_text(q_text),
                "co": co,
                "blooms_level": level,
                "marks": marks if marks > 0 else 5,
                "module": "1"
            })
    
    # Pattern 2: Question 1, Question 2, etc.
    pattern2 = re.findall(r'Question\s*(\d+)[:\.]?\s*(.*?)(?=Question\s*\d+[:\.]?\s*|$)', text_content, re.DOTALL | re.IGNORECASE)
    for q_num, q_text in pattern2:
        if q_text.strip():
            marks = extract_marks_from_text(q_text)
            co_match = re.search(r'CO\s*(\d+)', q_text, re.IGNORECASE)
            co = co_match.group(0) if co_match else "CO1"
            
            level_match = re.search(r'L\s*(\d+)', q_text, re.IGNORECASE)
            level = level_match.group(0) if level_match else "L1"
            
            questions.append({
                "sl_no": q_num,
                "question_text": clean_text(q_text),
                "co": co,
                "blooms_level": level,
                "marks": marks if marks > 0 else 5,
                "module": "1"
            })
    
    # Pattern 3: Just numbers (1., 2., 3., etc.)
    pattern3 = re.findall(r'^(\d+)\.\s*(.*?)(?=^\d+\.\s*|$)', text_content, re.MULTILINE | re.DOTALL)
    for q_num, q_text in pattern3:
        if q_text.strip() and len(q_text.strip()) > 20:  # Only if it looks like a real question
            marks = extract_marks_from_text(q_text)
            co_match = re.search(r'CO\s*(\d+)', q_text, re.IGNORECASE)
            co = co_match.group(0) if co_match else "CO1"
            
            level_match = re.search(r'L\s*(\d+)', q_text, re.IGNORECASE)
            level = level_match.group(0) if level_match else "L1"
            
            questions.append({
                "sl_no": q_num,
                "question_text": clean_text(q_text),
                "co": co,
                "blooms_level": level,
                "marks": marks if marks > 0 else 5,
                "module": "1"
            })
    
    # Remove duplicates based on question number
    seen_numbers = set()
    unique_questions = []
    for q in questions:
        if q["sl_no"] not in seen_numbers:
            seen_numbers.add(q["sl_no"])
            unique_questions.append(q)
    
    return unique_questions
