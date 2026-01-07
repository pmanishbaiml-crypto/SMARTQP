import sys
import os
import site

print(f"Python Executable: {sys.executable}")
print(f"User Site Packages: {site.getusersitepackages()}")
print("Sys Path:")
for p in sys.path:
    print(f"  {p}")

try:
    import docxtpl
    print(f"docxtpl imported from: {docxtpl.__file__}")
except ImportError as e:
    print(f"Failed to import docxtpl: {e}")

try:
    import docx
    print(f"python-docx imported from: {docx.__file__}")
except ImportError as e:
    print(f"Failed to import python-docx: {e}")
