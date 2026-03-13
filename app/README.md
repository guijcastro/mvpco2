# MVPCO — Sistema de Cliente Oculto para Varejo Ótico Premium

## Stack
- **Frontend:** HTML + Vanilla JS (sem framework)
- **Servidor local:** Bun (WSL) — proxy para FastAPI
- **API de análise:** Python + FastAPI + spaCy
- **Banco:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Netlify (frontend) + Railway/Render (FastAPI)

## Documentação
- [PLANEJAMENTO.md](PLANEJAMENTO.md) — Memória raiz do projeto
- [INDICE.md](INDICE.md) — Mapa completo de arquivos
- [docs/](docs/) — Plano detalhado por fase

## Sequência de Fases
1. [Fase 1 — Fundação](docs/fase1.md)
2. [Fase A — Benchmark de IAs](docs/fase_ai_benchmark.md)
3. [Fase B — Parsing: Testes e Validação](docs/fase_parsing.md)
4. [Fase 2 — Pipeline de Classificação](docs/fase2.md)
5. [Fase 3 — Relatórios Estruturados](docs/fase3.md)
6. [Fase 4 — Inteligência Avançada](docs/fase4.md)
7. [Fase 5 — Ecossistema e Escala](docs/fase5.md)

## Como rodar localmente (WSL)
```bash
# Terminal 1 — Frontend
bun run bun_server.js   # http://localhost:8888

# Terminal 2 — API Python
cd api
uvicorn main:app --reload --port 8001
```
