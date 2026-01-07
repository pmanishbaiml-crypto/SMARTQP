
from supabase_service import supabase_service

def verify_tables():
    print("Verifying Supabase tables...")
    tables_to_check = ['users', 'approvals', 'saved_question_papers', 'question_banks']
    
    for table in tables_to_check:
        try:
            # Try to fetch 1 record to check if table exists
            supabase_service.supabase.table(table).select('*').limit(1).execute()
            print(f"✅ Table '{table}' exists and is accessible.")
        except Exception as e:
            print(f"❌ Table '{table}' check failed: {e}")

if __name__ == "__main__":
    verify_tables()
