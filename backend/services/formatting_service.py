import re

def clean_text(text):
    """Basic text cleaning: remove excessive whitespace, newlines, strip leading/trailing space."""
    if text is None:
        return ""
    # Replace multiple spaces/newlines with a single space, then strip
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_marks_from_text(marks_text):
    """Extract numeric marks from various formats like '6M', '8M', '6', etc."""
    if not marks_text:
        return 0
    
    # Remove common suffixes and extract number
    marks_text = str(marks_text).strip().upper()
    
    # Handle formats like "6M", "8M", "10M"
    if marks_text.endswith('M'):
        try:
            return int(marks_text[:-1])
        except ValueError:
            pass
    
    # Handle formats like "6", "8", "10"
    try:
        return int(marks_text)
    except ValueError:
        pass
    
    # Handle formats like "6 marks", "8 marks"
    marks_match = re.search(r'(\d+)\s*marks?', marks_text, re.IGNORECASE)
    if marks_match:
        return int(marks_match.group(1))
    
    # Handle formats like "6 pts", "8 pts"
    pts_match = re.search(r'(\d+)\s*pts?', marks_text, re.IGNORECASE)
    if pts_match:
        return int(pts_match.group(1))
    
    return 0

def extract_table_as_text(table_data):
    """Convert table data to readable text format with proper formatting"""
    if not table_data:
        return ""
    
    table_text = ""
    for row in table_data:
        if row and any(cell for cell in row if cell and str(cell).strip()):
            # Filter out empty cells and join with proper spacing
            row_cells = [str(cell).strip() if cell else "" for cell in row]
            # Use consistent spacing instead of tabs for better display
            row_text = " | ".join(row_cells)
            table_text += row_text + "\n"
    
    return table_text.strip()

def extract_table_data_for_knn(table_data):
    """Extract table data specifically for k-NN dataset format"""
    if not table_data:
        return ""
    
    # Check if this looks like the k-NN dataset
    if len(table_data) > 0 and len(table_data[0]) >= 5:
        header_row = table_data[0]
        if any("S.NO" in str(cell) for cell in header_row) or any("CGPA" in str(cell) for cell in header_row):
            # This is the k-NN dataset format
            table_text = ""
            for row in table_data:
                if row and any(cell for cell in row if cell and str(cell).strip()):
                    row_cells = [str(cell).strip() if cell else "" for cell in row]
                    row_text = " | ".join(row_cells)
                    table_text += row_text + "\n"
            return table_text.strip()
    
    # Fallback to regular table extraction
    return extract_table_as_text(table_data)

def format_table_data_for_display(table_data):
    """Format table data specifically for frontend display with proper line breaks"""
    if not table_data:
        return ""
    
    formatted_rows = []
    for row in table_data:
        if row and any(cell for cell in row if cell and str(cell).strip()):
            # Filter out empty cells and join with proper spacing
            row_cells = [str(cell).strip() if cell else "" for cell in row]
            # Use pipe separators for better frontend parsing
            row_text = " | ".join(row_cells)
            formatted_rows.append(row_text)
    
    return "\n".join(formatted_rows)

def format_question_with_tables(question_text):
    """Format question text that may contain embedded table data"""
    if not question_text:
        return question_text
    
    # Check if the question contains concatenated table data (like "S.NO CGPA Assessment Project submitted Result 1 9.2 85 8 Pass 2 8 80 7 Pass...")
    if 'S.NO' in question_text and 'CGPA' in question_text and 'Assessment' in question_text:
        # This is likely the k-NN dataset format
        return format_knn_dataset_in_question(question_text)
    
    # Check for other table patterns like "S.NO GPA No. of projects done Award 1 9.5 5 Yes..."
    if 'S.NO' in question_text and 'GPA' in question_text and 'Award' in question_text:
        return format_gpa_award_dataset_in_question(question_text)
    
    # Check for other table patterns like "X Y Class 3 1 A 5 2 A..."
    if 'X Y Class' in question_text or ('X' in question_text and 'Y' in question_text and 'Class' in question_text):
        return format_xy_class_dataset_in_question(question_text)
    
    # Check if the question contains table-like data
    lines = question_text.split('\n')
    formatted_lines = []
    in_table = False
    table_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            if in_table and table_lines:
                # End of table, format it
                formatted_table = format_embedded_table(table_lines)
                formatted_lines.append(formatted_table)
                table_lines = []
                in_table = False
            continue
            
        # Check if this line looks like table data (has multiple space-separated values)
        words = line.split()
        # More specific conditions for table detection
        is_table_data = (
            len(words) >= 3 and 
            not any(word in line.lower() for word in ['question', 'consider', 'write', 'what', 'how', 'explain', 'describe', 'compare', 'contrast', 'differences', 'between', 'instance', 'based', 'learning', 'model', 'nearest', 'neighbour', 'algorithm', 'weighted', 'determine', 'class', 'given', 'test', 'assign', 'predict', 'using', 'classifier', 'centroid', 'training', 'dataset', 'target', 'variable', 'discrete', 'valued', 'takes', 'values', 'choose', 'k=']) and
            (any(word.isdigit() for word in words) or any(word in ['pass', 'fail', 'yes', 'no', 'a', 'b'] for word in words) or 
             any(word.lower() in ['s.no', 'sno', 'gpa', 'cgpa', 'x', 'y', 'class', 'award', 'result', 'assessment', 'project', 'submitted'] for word in words))
        )
        
        if is_table_data:
            # This looks like table data
            if not in_table:
                in_table = True
            table_lines.append(line)
        else:
            if in_table and table_lines:
                # End of table, format it
                formatted_table = format_embedded_table(table_lines)
                formatted_lines.append(formatted_table)
                table_lines = []
                in_table = False
            formatted_lines.append(line)
    
    # Handle table at the end
    if in_table and table_lines:
        formatted_table = format_embedded_table(table_lines)
        formatted_lines.append(formatted_table)
    
    return '\n'.join(formatted_lines)

def format_knn_dataset_in_question(question_text):
    """Format k-NN dataset that's concatenated in question text"""
    # Find the start of the table data
    table_start = question_text.find('S.NO')
    if table_start == -1:
        return question_text
    
    # Split into question part and table part
    question_part = question_text[:table_start].strip()
    table_part = question_text[table_start:].strip()
    
    # Format the table part
    formatted_table = format_concatenated_table(table_part)
    
    # Combine question and formatted table
    return f"{question_part}\n\n{formatted_table}"

def format_xy_class_dataset_in_question(question_text):
    """Format X Y Class dataset that's concatenated in the question text"""
    # Find where the table data starts
    table_start = question_text.find('X Y Class')
    if table_start == -1:
        # Try alternative patterns
        if 'X' in question_text and 'Y' in question_text and 'Class' in question_text:
            # Find the position where X Y Class appears
            words = question_text.split()
            for i, word in enumerate(words):
                if word == 'X' and i + 2 < len(words) and words[i+1] == 'Y' and words[i+2] == 'Class':
                    # Found "X Y Class", get the position in the original text
                    table_start = question_text.find(' '.join(words[i:i+3]))
                    break
    
    if table_start == -1:
        return question_text
    
    # Split into question part and table part
    question_part = question_text[:table_start].strip()
    table_part = question_text[table_start:].strip()
    
    # Format the table part
    formatted_table = format_xy_class_table(table_part)
    
    # Combine question and formatted table
    return f"{question_part}\n\n{formatted_table}"

def format_xy_class_table(table_text):
    """Format X Y Class table data"""
    words = table_text.split()
    
    # Find the header part (X Y Class)
    header_words = []
    data_start_idx = 0
    
    for i, word in enumerate(words):
        if word.isdigit() and i > 2:  # Found first number after headers
            data_start_idx = i
            break
        header_words.append(word)
    
    if len(header_words) < 3 or data_start_idx == 0:
        return f"Table:\n{table_text}"
    
    # Format headers
    headers = ' | '.join(header_words)
    formatted_table = f"Table:\n{headers}\n"
    
    # Format data rows (should be groups of 3: number, number, letter)
    data_words = words[data_start_idx:]
    for i in range(0, len(data_words), 3):
        if i + 2 < len(data_words):
            row = f"{data_words[i]} | {data_words[i+1]} | {data_words[i+2]}"
            formatted_table += row + "\n"
    
    return formatted_table.strip()

def format_gpa_award_dataset_in_question(question_text):
    """Format S.NO GPA Award dataset that's concatenated in the question text"""
    # Find where the table data starts
    table_start = question_text.find('S.NO')
    if table_start == -1:
        return question_text
    
    # Split into question part and table part
    question_part = question_text[:table_start].strip()
    table_part = question_text[table_start:].strip()
    
    # Format the table part
    formatted_table = format_gpa_award_table(table_part)
    
    # Combine question and formatted table
    return f"{question_part}\n\n{formatted_table}"

def format_gpa_award_table(table_text):
    """Format S.NO GPA Award table data"""
    words = table_text.split()
    
    # Find the header part (S.NO GPA No. of projects done Award)
    header_words = []
    data_start_idx = 0
    
    for i, word in enumerate(words):
        if word.isdigit() and i > 3:  # Found first number after headers
            data_start_idx = i
            break
        header_words.append(word)
    
    if len(header_words) < 4 or data_start_idx == 0:
        return f"Table:\n{table_text}"
    
    # Format headers
    headers = ' | '.join(header_words)
    formatted_table = f"Table:\n{headers}\n"
    
    # Format data rows (should be groups of 4: number, decimal, number, yes/no)
    data_words = words[data_start_idx:]
    for i in range(0, len(data_words), 4):
        if i + 3 < len(data_words):
            row = f"{data_words[i]} | {data_words[i+1]} | {data_words[i+2]} | {data_words[i+3]}"
            formatted_table += row + "\n"
    
    return formatted_table.strip()

def format_concatenated_table(table_text):
    """Format concatenated table text like 'S.NO CGPA Assessment Project submitted Result 1 9.2 85 8 Pass 2 8 80 7 Pass...'"""
    words = table_text.split()
    
    # Find the header part
    header_words = []
    data_start_idx = 0
    
    for i, word in enumerate(words):
        if word.isdigit() and i > 0:  # Found first number (row number)
            data_start_idx = i
            break
        header_words.append(word)
    
    if not header_words or data_start_idx == 0:
        return f"Table:\n{table_text}"
    
    # Format headers
    headers = ' | '.join(header_words)
    
    # Format data rows
    data_words = words[data_start_idx:]
    rows = []
    current_row = []
    
    for word in data_words:
        if word.isdigit() and len(current_row) >= 4:  # New row starting
            if current_row:
                rows.append(' | '.join(current_row))
            current_row = [word]
        else:
            current_row.append(word)
    
    # Add the last row
    if current_row:
        rows.append(' | '.join(current_row))
    
    # Combine everything
    result = f"Table:\n{headers}\n" + '\n'.join(rows)
    return result

def format_embedded_table(table_lines):
    """Format embedded table lines into a proper table structure"""
    if not table_lines:
        return ""
    
    # Check if first line looks like headers
    first_line_words = table_lines[0].split()
    if len(first_line_words) >= 2 and not any(word.isdigit() for word in first_line_words):
        # First line is likely headers
        headers = ' | '.join(first_line_words)
        data_lines = table_lines[1:]
    else:
        # No clear headers, treat all as data
        headers = None
        data_lines = table_lines
    
    formatted_table = "Table:\n"
    if headers:
        formatted_table += headers + "\n"
    
    for line in data_lines:
        words = line.split()
        if len(words) >= 2:
            formatted_line = ' | '.join(words)
            formatted_table += formatted_line + "\n"
    
    return formatted_table.strip()

def extract_table_from_docx_cell(cell):
    """Extract table content from a DOCX cell if it contains a table"""
    table_text = ""
    for table in cell.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells]
            table_text += "\t".join(row_cells) + "\n"
    return table_text.strip()
