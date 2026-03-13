const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://kikhexoxlkzofccnnkze.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2hleG94bGt6b2ZjY25ua3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzAwMzAsImV4cCI6MjA4ODY0NjAzMH0.wbBTASBQsP76PatkLCAt3Yv_A1IE_mgQ8pK17MB0uVk";
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("Fetching chat sessions...");
    const { data: sessions, error: sessionErr } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);

    if (sessionErr) console.error("Session Error:", sessionErr);
    else {
        console.log("Last 2 sessions:", JSON.stringify(sessions, null, 2));

        if (sessions && sessions.length > 0) {
            const sessionId = sessions[0].id;
            console.log(`\nFetching messages for session: ${sessionId}`);
            const { data: msgs, error: msgErr } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (msgErr) console.error("Msg Error:", msgErr);
            else console.log("Messages:", JSON.stringify(msgs, null, 2));
        }
    }
}

runTest();
