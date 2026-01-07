import sys
import os
import time

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("Attempting to import app...")
    from app import app, cache
    print("Successfully imported app and cache.")

    # Create a test request context
    with app.test_request_context():
        print("Testing cache set/get...")
        cache.set('test_key', 'test_value')
        val = cache.get('test_key')
        if val == 'test_value':
            print("Cache working correctly!")
        else:
            print(f"Cache failed! Expected 'test_value', got {val}")
            sys.exit(1)

    print("Caching verification successful!")
except Exception as e:
    print(f"Verification failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
