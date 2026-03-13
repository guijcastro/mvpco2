import os
from supabase import create_client

supabase = create_client(
    os.environ.get("SUPABASE_URL", "https://kikhexoxlkzofccnnkze.supabase.co"),
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2hleG94bGt6b2ZjY25ua3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzAwMzAsImV4cCI6MjA4ODY0NjAzMH0.wbBTASBQsP76PatkLCAt3Yv_A1IE_mgQ8pK17MB0uVk"
)

res = supabase.table("transcriptions").select("id, word_count, text, created_at").order("created_at", desc=True).limit(1).execute()
if res.data:
    row = res.data[0]
    print(f"ID: {row['id']}")
    print(f"Words: {row['word_count']}")
    text = row['text']
    print(f"Last 500 chars:\n{text[-500:]}\n\nTotal length: {len(text)}")
else:
    print("No transcriptions found")
