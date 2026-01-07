
import sys
print(f"Python Executable: {sys.executable}")
try:
    import easyocr
    print("easyocr imported successfully")
    import pix2tex
    print("pix2tex imported successfully")
except ImportError as e:
    print(f"ImportError: {e}")
