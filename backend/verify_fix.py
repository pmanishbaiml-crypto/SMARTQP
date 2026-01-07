import sys
import os

# Hardcoded path from diagnostic output
user_site = r"C:\Users\manis\AppData\Roaming\Python\Python310\site-packages"

print(f"Before: {len(sys.path)} paths")
if user_site not in sys.path:
    sys.path.append(user_site)
print(f"After: {len(sys.path)} paths")

try:
    import docxtpl
    print(f"Success! docxtpl imported from: {docxtpl.__file__}")
except ImportError as e:
    print(f"Still failed: {e}")
