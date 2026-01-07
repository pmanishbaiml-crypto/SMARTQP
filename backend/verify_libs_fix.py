import sys
import os

# Mimic app.py logic
libs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'libs')
if libs_path not in sys.path:
    sys.path.insert(0, libs_path)

print(f"Added libs path: {libs_path}")

try:
    import docxtpl
    print(f"✅ Success! docxtpl imported from: {docxtpl.__file__}")
except ImportError as e:
    print(f"❌ Failed: {e}")
