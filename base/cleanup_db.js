
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials");
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

    for (const file of files) {
        // key based on name and user_id. 
        // If we want to be stricter, we can include content length, but file_name (title) for manual entries is a good proxy.
        // For actual uploads, file_name might be same but content different.
        // Let's focus on manual entries which have 'manual/' in storage_path

        if (file.storage_path && file.storage_path.startsWith('manual/')) {
            const key = `${file.user_id}-${file.file_name}`;
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
        // Delete audio_file entry (and cascade should handle transcription if set up, or we assume orphan is fine for now)
        const { error: delError } = await supabase
            .from('audio_files')
            .delete()
            .eq('id', file.id);

        if (delError) console.error(`Failed to delete ${file.id}:`, delError);
        else console.log(`✅ Deleted ${file.id}`);
    }
}

cleanDuplicates();
