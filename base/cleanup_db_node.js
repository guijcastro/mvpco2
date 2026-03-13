
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://kikhexoxlkzofccnnkze.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2hleG94bGt6b2ZjY25ua3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzAwMzAsImV4cCI6MjA4ODY0NjAzMH0.wbBTASBQsP76PatkLCAt3Yv_A1IE_mgQ8pK17MB0uVk";

if (SUPABASE_URL === "YOUR_URL") {
    console.error("Please set SUPABASE_URL and SUPABASE_KEY env vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanDuplicates() {
    console.log("🔍 Checking for duplicates...");

    const { data: files, error } = await supabase
        .from('audio_files')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching files:", error);
        return;
    }

    const seen = new Set();
    const duplicates = [];

    // Filter for duplicates based on name/title for manual entries
    for (const file of files) {
        if (file.storage_path && file.storage_path.startsWith('manual/')) {
            const key = file.file_name; // unique by title for this user
            if (seen.has(key)) {
                duplicates.push(file);
            } else {
                seen.add(key);
            }
        }
    }

    console.log(`Found ${duplicates.length} duplicate manual entries.`);

    for (const file of duplicates) {
        console.log(`🗑️ Deleting duplicate: ${file.file_name} (ID: ${file.id})`);
        const { error: delError } = await supabase
            .from('audio_files')
            .delete()
            .eq('id', file.id);

        if (delError) console.error(`Failed to delete ${file.id}:`, delError);
        else console.log(`✅ Deleted ${file.id}`);
    }
}

cleanDuplicates();
