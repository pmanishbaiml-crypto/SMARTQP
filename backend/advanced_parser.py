
import os
import numpy as np
import pdfplumber

# Robust Imports for Optional Dependencies
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
    print("Warning: PyMuPDF (fitz) not found. Image extraction will be disabled/limited.")

try:
    import easyocr
except ImportError:
    easyocr = None
    print("Warning: EasyOCR not found. OCR capabilities disabled.")

try:
    import cv2
except ImportError:
    cv2 = None
    print("Warning: OpenCV (cv2) not found. Image processing disabled.")

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from pix2tex.cli import LatexOCR
except ImportError:
    LatexOCR = None
    print("Warning: LatexOCR (pix2tex) not found. Math OCR disabled.")


class AdvancedParser:
    def __init__(self):
        print("Initializing Advanced Parser...")
        
        # Initialize EasyOCR reader ONLY if available
        if easyocr:
            try:
                self.reader = easyocr.Reader(['en'], gpu=False) # Set gpu=True if CUDA is available
            except Exception as e:
                print(f"Error initializing EasyOCR: {e}")
                self.reader = None
        else:
            self.reader = None
        
        # Initialize Math OCR ONLY if available
        if LatexOCR:
            try:
                self.math_model = LatexOCR()
                print("Math OCR model loaded.")
            except Exception as e:
                print(f"Warning: Could not load Math OCR model: {e}")
                self.math_model = None
        else:
            self.math_model = None

    def format_table_as_string(self, table):
        """Formats a pdfplumber table as a string with Table: marker."""
        data = table.extract()
        if not data: return ""
        
        formatted = "Table:\n"
        for row in data:
            # Clean cells: remove newlines within cells to keep structure clean
            clean_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
            formatted += " | ".join(clean_row) + "\n"
        return formatted

    def extract_text_excluding_areas(self, page, cell_bbox, exclusion_bboxes):
        """
        Extracts text from a specific cell bbox, excluding text that falls within exclusion_bboxes.
        Returns None on error, so caller can distinguish between empty text and error.
        """
        try:
            # Filter objects on the ORIGINAL page first (using absolute coordinates)
            # This avoids coordinate shifting issues with crop()
            
            def not_inside_exclusion(obj):
                # obj is a char dict with 'x0', 'top', 'x1', 'bottom' (absolute page coordinates)
                
                obj_x0 = obj.get('x0', 0)
                obj_top = obj.get('top', 0)
                obj_x1 = obj.get('x1', 0)
                obj_bottom = obj.get('bottom', 0)
                
                obj_center_x = (obj_x0 + obj_x1) / 2
                obj_center_y = (obj_top + obj_bottom) / 2
                
                for bbox in exclusion_bboxes:
                    # bbox is (x0, top, x1, bottom)
                    # Add a small buffer (e.g. 1px) to ensure we catch edge cases
                    buffer = 1
                    if (bbox[0] - buffer <= obj_center_x <= bbox[2] + buffer and 
                        bbox[1] - buffer <= obj_center_y <= bbox[3] + buffer):
                        return False
                return True

            # Filter the whole page first
            filtered_page = page.filter_objects(not_inside_exclusion)
            
            # THEN crop to the specific cell/row area
            # cell_bbox is (x0, top, x1, bottom)
            final_cell_page = filtered_page.crop(cell_bbox)
            
            return final_cell_page.extract_text()
        except Exception as e:
            print(f"Error in extract_text_excluding_areas: {e}")
            return None

    def extract_images_from_pdf(self, pdf_path, output_folder):
        """Extracts images from a PDF and returns metadata including bbox."""
        doc = fitz.open(pdf_path)
        image_metadata = []
        
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)

        for i, page in enumerate(doc):
            image_list = page.get_images(full=True)
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                image_filename = f"page{i+1}_img{img_index+1}.{image_ext}"
                image_path = os.path.join(output_folder, image_filename)
                
                # Get bounding box(es) of the image on the page
                # An image can appear multiple times, we'll take the first occurrence for now
                rects = page.get_image_rects(xref)
                bbox = rects[0] if rects else fitz.Rect(0, 0, 0, 0)
                
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                
                image_metadata.append({
                    "path": image_path,
                    "filename": image_filename,
                    "page": i + 1,
                    "bbox": (bbox.x0, bbox.y0, bbox.x1, bbox.y1) # (left, top, right, bottom)
                })
                print(f"Extracted image: {image_filename} at {bbox}")
                
        return image_metadata

    def parse_pdf(self, pdf_path, output_image_folder="extracted_images"):
        """
        Parses PDF using pdfplumber for text/tables and PyMuPDF for images.
        Falls back to OCR if no text is found.
        """
        print(f"Parsing PDF: {pdf_path}")
        parsed_content = []
        
        # Extract images first using PyMuPDF (it's faster/better for images)
        # Returns list of dicts: {'path': ..., 'filename': ..., 'page': ..., 'bbox': (x0, y0, x1, y1)}
        extracted_images = self.extract_images_from_pdf(pdf_path, output_image_folder)
        
        # Try parsing with pdfplumber first (best for tables)
        with pdfplumber.open(pdf_path) as pdf:
            # Persist column indices across pages
            last_known_indices = {
                "question": -1, "sl": -1, "marks": -1, "co": -1, "level": -1, "module": -1
            }
            
            for i, page in enumerate(pdf.pages):
                print(f"Processing page {i+1}...")
                page_questions = []
                
                # Get images for this page
                page_images = [img for img in extracted_images if img['page'] == i + 1]
                
                # Strategy 1: Table Extraction
                # find_tables() returns Table objects with .bbox attribute
                tables = page.find_tables()
                
                # Identify nested tables (tables inside other tables)
                nested_tables = {} # child_idx -> parent_idx
                for t_idx1, t1 in enumerate(tables):
                    for t_idx2, t2 in enumerate(tables):
                        if t_idx1 == t_idx2: continue
                        # Check if t1 is inside t2
                        # We use a tolerance of 5 pixels
                        if (t1.bbox[0] >= t2.bbox[0] - 5 and t1.bbox[1] >= t2.bbox[1] - 5 and 
                            t1.bbox[2] <= t2.bbox[2] + 5 and t1.bbox[3] <= t2.bbox[3] + 5):
                            nested_tables[t_idx1] = t_idx2
                            print(f"Table {t_idx1+1} is nested inside Table {t_idx2+1}")

                if tables:
                    print(f"Found {len(tables)} tables on page {i+1}")
                    for t_idx, table in enumerate(tables):
                        # Skip if this table is nested inside another
                        if t_idx in nested_tables:
                            continue

                        # Get the table data (text content)
                        table_data = table.extract()
                        
                        # Identify columns based on headers
                        header_row_index = -1
                        question_col_index = -1
                        sl_col_index = -1
                        marks_col_index = -1
                        co_col_index = -1
                        level_col_index = -1
                        module_col_index = -1
                        
                        # Check for header in this table
                        for r_idx, row_data in enumerate(table_data):
                            # Clean row items
                            row_data = [str(cell).strip() if cell else "" for cell in row_data]
                            
                            # Check for header
                            if any("Question" in cell for cell in row_data) or any("Marks" in cell for cell in row_data):
                                header_row_index = r_idx
                                for c_idx, cell in enumerate(row_data):
                                    if "Question" in cell: question_col_index = c_idx
                                    if "SL" in cell or "Sl" in cell or "No" in cell: sl_col_index = c_idx
                                    if "Marks" in cell: marks_col_index = c_idx
                                    if "CO" in cell: co_col_index = c_idx
                                    if "Level" in cell or "RBT" in cell: level_col_index = c_idx
                                    if "Module" in cell: module_col_index = c_idx
                                break
                        
                        # Update last known indices if header found
                        if header_row_index != -1 and question_col_index != -1:
                            last_known_indices = {
                                "question": question_col_index,
                                "sl": sl_col_index,
                                "marks": marks_col_index,
                                "co": co_col_index,
                                "level": level_col_index,
                                "module": module_col_index
                            }
                        
                        # Determine start row and indices to use
                        start_row = 0
                        use_indices = None
                        
                        if header_row_index != -1:
                            start_row = header_row_index + 1
                            use_indices = last_known_indices
                        elif last_known_indices["question"] != -1:
                            # No header found, but we have indices from previous page/table
                            print("No header found, using indices from previous page.")
                            start_row = 0
                            use_indices = last_known_indices
                        
                        # Extract data if we have valid indices
                        if use_indices and use_indices["question"] != -1:
                            q_idx = use_indices["question"]
                            m_idx = use_indices["marks"]
                            c_idx = use_indices["co"]
                            l_idx = use_indices["level"]
                            s_idx = use_indices["sl"]
                            mod_idx = use_indices["module"]
                            
                            for r_idx in range(start_row, len(table_data)):
                                row_data = table_data[r_idx]
                                # Clean row items
                                row_data = [str(cell).strip() if cell else "" for cell in row_data]
                                
                                # Ensure row has enough columns
                                if len(row_data) <= q_idx: continue
                                
                                # Get Row BBox first (needed for nested table detection)
                                try:
                                    row_obj = table.rows[r_idx]
                                    row_bbox = row_obj.bbox # (x0, top, x1, bottom)
                                    row_bottom = row_bbox[3]
                                    row_top = row_bbox[1]
                                except:
                                    row_bottom = 0
                                    row_top = 0
                                    row_bbox = None

                                # Check for nested tables inside this row BEFORE extracting text
                                nested_tables_in_row = []
                                for child_idx, parent_idx in nested_tables.items():
                                    if parent_idx == t_idx:
                                        child_table = tables[child_idx]
                                        # Check if child is in this row (vertically)
                                        ct_bbox = child_table.bbox
                                        ct_center_y = (ct_bbox[1] + ct_bbox[3]) / 2
                                        
                                        if row_top <= ct_center_y <= row_bottom:
                                            nested_tables_in_row.append(child_table)

                                # Extract question text
                                # If we have nested tables, we'll clean up the text after extraction
                                question_text = row_data[q_idx]
                                
                                if not question_text: continue
                                
                                # Inject formatted tables and remove duplicate text
                                for child_table in nested_tables_in_row:
                                    print(f"Processing nested table in question row {r_idx+1}")
                                    print(f"BEFORE removal: '{question_text}'")
                                    formatted_inner = self.format_table_as_string(child_table)
                                    
                                    # Extract the raw text from the nested table to identify what to remove
                                    child_data = child_table.extract()
                                    if child_data:
                                        # Build the jumbled text pattern (how pdfplumber extracts it)
                                        # It typically concatenates all cells with spaces
                                        jumbled_parts = []
                                        for child_row in child_data:
                                            for cell in child_row:
                                                if cell:
                                                    cell_text = str(cell).strip()
                                                    if cell_text:
                                                        jumbled_parts.append(cell_text)
                                        
                                        print(f"Table parts: {jumbled_parts}")
                                        
                                        # Try multiple removal strategies
                                        # Strategy 1: All parts joined with spaces
                                        jumbled_text = " ".join(jumbled_parts)
                                        if jumbled_text in question_text:
                                            question_text = question_text.replace(jumbled_text, "", 1)  # Only replace first occurrence
                                            print(f"Removed (with spaces): '{jumbled_text[:50]}...'")
                                        # Strategy 2: All parts joined without spaces
                                        elif "".join(jumbled_parts) in question_text:
                                            jumbled_text_no_space = "".join(jumbled_parts)
                                            question_text = question_text.replace(jumbled_text_no_space, "", 1)
                                            print(f"Removed (no spaces): '{jumbled_text_no_space[:50]}...'")
                                        # Strategy 3: Try with newlines (table rows might be on separate lines)
                                        else:
                                            # Build row-by-row pattern
                                            for child_row in child_data:
                                                row_text = " ".join([str(cell).strip() for cell in child_row if cell])
                                                if row_text in question_text:
                                                    question_text = question_text.replace(row_text, "", 1)
                                                    print(f"Removed row: '{row_text[:30]}...'")
                                        
                                        # Clean up extra whitespace
                                        question_text = " ".join(question_text.split())
                                        print(f"AFTER removal: '{question_text}'")
                                    
                                    # Append the formatted table
                                    question_text += "\n" + formatted_inner
                                
                                # Extract other metadata
                                marks = row_data[m_idx] if m_idx != -1 and len(row_data) > m_idx else "10"
                                co = row_data[c_idx] if c_idx != -1 and len(row_data) > c_idx else "CO1"
                                level = row_data[l_idx] if l_idx != -1 and len(row_data) > l_idx else "L1"
                                sl_no = row_data[s_idx] if s_idx != -1 and len(row_data) > s_idx else ""
                                sl_no_cleaned = ''.join(filter(str.isdigit, sl_no))
                                module = row_data[mod_idx] if mod_idx != -1 and len(row_data) > mod_idx else "1"

                                # Logic to decide if this is a new question or continuation
                                # If SL is present, it's a new question.
                                # If SL is empty, it's a continuation of the previous question.
                                
                                is_continuation = False
                                if not sl_no_cleaned:
                                    # SL is empty. Check if we have a previous question to append to.
                                    if page_questions:
                                        # Append to last question on this page
                                        page_questions[-1]["question_text"] += "\n" + question_text
                                        # Update bbox_bottom to include this row
                                        page_questions[-1]["bbox_bottom"] = max(page_questions[-1]["bbox_bottom"], row_bottom)
                                        is_continuation = True
                                    elif parsed_content:
                                        # Append to last question from previous page
                                        parsed_content[-1]["question_text"] += "\n" + question_text
                                        is_continuation = True
                                
                                if not is_continuation:
                                    page_questions.append({
                                        "question_text": question_text,
                                        "marks": marks,
                                        "co": co,
                                        "blooms_level": level,
                                        "sl_no": sl_no_cleaned,
                                        "module": module,
                                        "images": [],
                                        "formulas": [],
                                        "bbox_bottom": row_bottom, # Store for image association
                                        "bbox_top": row_top
                                    })
                        else:
                            pass

                # Strategy 2: Text Extraction (Fallback)
                if not page_questions:
                    # ... (Text extraction logic - simplified for brevity as table is primary focus)
                    pass

                # Associate images with questions based on coordinates
                if page_questions and page_images:
                    # Sort questions by vertical position (top)
                    page_questions.sort(key=lambda x: x.get('bbox_top', 0))
                    
                    for img in page_images:
                        img_top = img['bbox'][1]
                        img_bottom = img['bbox'][3]
                        img_filename = img['filename']
                        
                        # Find the question that is immediately above this image
                        # We look for a question where q_bottom <= img_top (or close to it)
                        # and minimize (img_top - q_bottom)
                        
                        best_q = None
                        min_dist = float('inf')
                        
                        for q in page_questions:
                            q_bottom = q.get('bbox_bottom', 0)
                            q_top = q.get('bbox_top', 0)
                            
                            # Case 1: Image is visually below the question row
                            if img_top >= q_bottom - 5: # Tolerance of 5 units overlap
                                dist = img_top - q_bottom
                                if dist < min_dist:
                                    min_dist = dist
                                    best_q = q
                            
                            # Case 2: Image is INSIDE the question row (e.g. side by side or large cell)
                            # If image center is within question vertical range
                            img_center_y = (img_top + img_bottom) / 2
                            if q_top <= img_center_y <= q_bottom:
                                best_q = q
                                break # Strong match
                        
                        if best_q:
                            best_q["images"].append(img_filename)
                        else:
                            # If no question found above (e.g. image at top of page), attach to first question?
                            # Or maybe it belongs to the previous page's last question? (Not handling cross-page yet)
                            # For now, if it's at the top, maybe it's a header logo, ignore or attach to first.
                            if page_questions:
                                # If it's really close to the first question, attach it
                                if img_bottom < page_questions[0]['bbox_top']:
                                     # Likely header, ignore
                                     pass
                                else:
                                     # Attach to last question as fallback? No, that caused the issue.
                                     # Let's leave it unattached if it doesn't fit logic, or attach to nearest.
                                     pass

                # Remove temporary bbox keys before adding to result
                for q in page_questions:
                    q.pop('bbox_bottom', None)
                    q.pop('bbox_top', None)
                
                parsed_content.extend(page_questions)

        return parsed_content

# Global instance
advanced_parser = None

def get_advanced_parser():
    global advanced_parser
    if advanced_parser is None:
        advanced_parser = AdvancedParser()
    return advanced_parser
