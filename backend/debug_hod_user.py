
from supabase_service import supabase_service

def list_users():
    print("Fetching users from Supabase...")
    try:
        # Fetch all users
        response = supabase_service.supabase.table('users').select('*').execute()
        users = response.data
        
        if not users:
            print("No users found in Supabase.")
            return

        print(f"Found {len(users)} users:")
        print("-" * 80)
        print(f"{'Email':<30} | {'Role':<10} | {'Name':<20} | {'Firebase UID'}")
        print("-" * 80)
        
        for user in users:
            print(f"{user.get('email', 'N/A'):<30} | {user.get('role', 'N/A'):<10} | {user.get('name', 'N/A'):<20} | {user.get('firebase_uid', 'N/A')}")
            
    except Exception as e:
        print(f"Error fetching users: {e}")

if __name__ == "__main__":
    list_users()
