// public/js/config.js — Configuração global do frontend MVPCO
window.SUPABASE_URL = "https://kikhexoxlkzofccnnkze.supabase.co";
window.SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2hleG94bGt6b2ZjY25ua3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzAwMzAsImV4cCI6MjA4ODY0NjAzMH0.wbBTASBQsP76PatkLCAt3Yv_A1IE_mgQ8pK17MB0uVk";

// API base: em local usa Bun como proxy; em produção usa caminho relativo (Netlify redireciona /api/*)
window.API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8888'
    : '';

window.APP_VERSION = '2.0.0';
