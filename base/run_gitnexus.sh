#!/bin/bash

# ==============================================================================
# Script de Inicialização Rápida para o GitNexus
# Este script reindexa todo o código do repositório (analyze) e logo 
# após sobe o servidor web (serve) localmente na porta 4747.
# ==============================================================================

echo "🌊 Iniciando o GitNexus no AI-Audio-Analyst..."
echo "--------------------------------------------------------"

# 1. Indexar o repositório atual
echo "🔍 (Passo 1/2) Indexando os arquivos atuais com o KuzuDB..."
npx -y gitnexus analyze .
if [ $? -ne 0 ]; then
    echo "❌ Erro ao analisar o repositório. O processo foi abortado."
    exit 1
fi
echo "✅ Repositório indexado com sucesso!"
echo "--------------------------------------------------------"

# 2. Iniciar o Servidor Web e MCP
echo "🚀 (Passo 2/2) Iniciando o servidor web do GitNexus Backend..."
echo "👉 Acesse a UI em: https://gitnexus.vercel.app"
echo "👉 Servidor Local rodando em: http://127.0.0.1:4747"
echo ""
echo "Pressione Ctrl+C para encerrar o servidor."
echo "--------------------------------------------------------"
npx -y gitnexus serve
