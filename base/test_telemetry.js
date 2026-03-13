const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://kikhexoxlkzofccnnkze.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2hleG94bGt6b2ZjY25ua3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzAwMzAsImV4cCI6MjA4ODY0NjAzMH0.wbBTASBQsP76PatkLCAt3Yv_A1IE_mgQ8pK17MB0uVk";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Checking Telemetry...');
    const { data: tel } = await supabase
        .from('usage_telemetry')
        .select('created_at, operation_type, provider, model')
        .eq('operation_type', 'transcription')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log('Telemetry:', tel);

    console.log('\nChecking Transcriptions...');
    const { data: trans } = await supabase
        .from('transcriptions')
        .select('id, created_at, model')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log('Transcripts:', trans);
}
run();
