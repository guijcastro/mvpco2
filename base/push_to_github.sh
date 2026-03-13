#!/bin/bash
set -e

PROJECT="/mnt/c/Users/User/.gemini/antigravity/scratch/AI-Audio-Analyst"
BRAIN="/mnt/c/Users/User/.gemini/antigravity/brain/7cbca616-4fdb-4e4a-b537-444c0ab98f4d"

echo "=== Criando estrutura docs/ ==="
mkdir -p "$PROJECT/docs/sessao_ia/logs"
mkdir -p "$PROJECT/docs/sql"

echo "=== Copiando SQLs ==="
cp "$PROJECT"/*.sql "$PROJECT/docs/sql/" 2>/dev/null && echo "SQL copiados" || echo "Nenhum SQL"
cp "$PROJECT"/*.py "$PROJECT/docs/" 2>/dev/null && echo "Scripts .py copiados" || true
cp "$PROJECT"/*.ps1 "$PROJECT/docs/" 2>/dev/null && echo "Scripts .ps1 copiados" || true

echo "=== Copiando artefatos da sessao IA ==="
cp "$BRAIN/implementation_plan.md" "$PROJECT/docs/sessao_ia/" && echo "plan OK" || echo "plan FAIL"
cp "$BRAIN/walkthrough.md" "$PROJECT/docs/sessao_ia/" && echo "walkthrough OK" || echo "walkthrough FAIL"
cp "$BRAIN/task.md" "$PROJECT/docs/sessao_ia/" && echo "task OK" || echo "task FAIL"

echo "=== Copiando logs da sessao ==="
cp -r "$BRAIN/.system_generated/logs/." "$PROJECT/docs/sessao_ia/logs/" && echo "Logs OK" || echo "Logs FAIL"

echo "=== Inicializando git ==="
cd "$PROJECT"
git init
git config user.email "guijcastro@users.noreply.github.com"
git config user.name "guijcastro"

echo "=== Configurando remote ==="
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/guijcastro/cliente-oculto.git

echo "=== Criando .gitignore ==="
cat > .gitignore << 'EOF'
node_modules/
.netlify/
*.env
.env
.env.local
EOF

echo "=== Adicionando todos os arquivos ==="
git add -A
git status --short

echo "=== Commit ==="
git commit -m "feat: v0.5 - Sistema de 40 Relatorios Individuais + Store ID + Upload de Audios

- Novo sistema de relatorios (relatorio_dinamico.html) com sidebar de 33+ relatorios
- Cada metrica do JSON schema tem layout e grafico dedicado (9 modulos JS)
- Filtro global por Loja (store_id) em todos os relatorios
- Store ID capturado no upload.html e gravado no Supabase
- Navbar atualizada em todas as paginas (4 links: Meus Audios, Relatorios, Configuracoes, Sair)
- SQL scripts: store_setup.sql, classification_setup.sql, telemetry_setup.sql
- Historico completo da sessao IA em docs/sessao_ia/"

echo "=== Criando tag v0.5 ==="
git tag -a v0.5 -m "Versao 0.5 - Sistema de 40 Relatorios + Store Tracking"

echo "=== Push ==="
git push -u origin main --tags --force

echo "DONE"
