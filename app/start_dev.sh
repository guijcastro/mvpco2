#!/bin/bash
# start_dev.sh — Inicializa o ambiente de desenvolvimento MVPCO inteiramente no WSL

ROOT="/mnt/c/Users/User/.gemini/antigravity/scratch/MVPCO/app"
API="$ROOT/api"

echo "🚀 MVPCO — Iniciando servidores WSL nativos..."

# Exporta PATH para binários do pip e bun do usuário Linux
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"

echo ""
echo "▶ Iniciando FastAPI (porta 8001)..."
cd "$API"
# Usa python3 caso uvicorn não esteja no path global
python3 -m uvicorn main:app --reload --port 8001 --host 0.0.0.0 &
FASTAPI_PID=$!
echo "  FastAPI PID: $FASTAPI_PID"

sleep 3

echo ""
echo "▶ Iniciando Web Server Bun (porta 8888)..."
cd "$ROOT"
bun run bun_server.js &
BUN_PID=$!
echo "  Bun PID: $BUN_PID"

echo ""
echo "✅ Servidores iniciados! Acesse no host Windows:"
echo "   http://localhost:8888/upload.html"
echo ""
echo "Para parar os servidores: kill $FASTAPI_PID $BUN_PID (ou Ctrl+C)"

wait
