# FASE 5 — Ecossistema e Escala

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Pré-requisito: [Fase 4](fase4.md) 100% validada.

## Status

🔴 **NÃO INICIADA**

## Objetivo

Evoluir para plataforma multi-tenant, API pública e gamificação. Cobre funcionalidades **#25, #26, #35–#38** do docx e as decisões de risco da Seção 8.

---

## A1. Simulador de Conversas com IA (#35 do docx)

### `api/routers/simulator.py` — [ ] Pendente

Geração de personas sintéticas de clientes para treinamento de vendedores:

```python
class PersonaProfile(BaseModel):
    archetype: Literal["RACIONAL", "EMOCIONAL", "SOCIAL", "CONSERVADOR"]
    objection_probability: dict   # {PRECO_ALTO: 0.8, URGENCIA_BAIXA: 0.4}
    intent_level: Literal["BROWSING", "PESQUISANDO", "PRONTO"]
    backstory: str

async def generate_persona(params: dict) -> PersonaProfile:
    """Gera um cliente sintético com perfil e objeções prováveis."""
    ...

async def simulate_turn(conversation_history: list, persona: PersonaProfile) -> str:
    """
    Dado o histórico da conversa, gera a próxima fala do cliente sintético.
    Usa o perfil psicológico para calibrar tom, urgência e objeções.
    """
    ...

async def evaluate_vendor_response(conversation: list, persona: PersonaProfile) -> dict:
    """
    Após o simulador, usa o Agente 3 para avaliar a eficácia do vendedor.
    Retorna score, pontos fortes e melhorias específicas.
    """
    ...
```

**UI em `public/simulator.html`:**
- Configurar intensidade e perfil da persona (dropdown)
- Interface de chat onde o vendedor fala e a IA responde como cliente
- Ao finalizar: relatório de performance com score e feedback do Agente 3

**Critério:** Sessão completa de simulação com persona e feedback gerado.

---

## A2. Gestão Multi-Loja e Multi-Tenant (#25 do docx)

### `supabase/08_organizations.sql` — [ ] Pendente

```sql
-- Hierarquia: Rede → Região → Cidade → Loja → Vendedor
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('rede', 'regiao', 'cidade', 'loja')),
  parent_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  role TEXT CHECK (role IN ('admin', 'gerente_regional', 'gerente_loja', 'vendedor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: gerente_loja vê apenas sua loja, gerente_regional vê todas da região
-- (Antigravity gera as policies completas para cada tabela)
```

**UI:** Painel admin para criar lojas, vincular usuários e definir papéis.

**Critério:** Gerente de loja A não vê dados da loja B. Gerente regional vê ambas.

---

## A3. Detecção de Silêncios e Qualidade de Áudio (#2 do docx, Grupo 2)

### `api/pipeline/audio_preprocess.py` — [ ] Pendente

```python
# Requer: pip install librosa soundfile
import librosa
import numpy as np

def analyze_audio_quality(audio_path: str) -> dict:
    """
    Pré-processamento antes da transcrição:
    - Detecção de silêncios (regiões < -40dB por > 3s)
    - Estimativa de SNR (Signal-to-Noise Ratio)
    - Detecção de múltiplos falantes via análise espectral básica
    - Flag de baixa qualidade se SNR < 15dB
    """
    y, sr = librosa.load(audio_path, sr=None)
    silence_intervals = librosa.effects.split(y, top_db=40)
    ...
    return {
        "duration_seconds": len(y) / sr,
        "silence_ratio": ...,
        "estimated_snr_db": ...,
        "multiple_speakers_likely": ...,
        "quality_flag": "low" | "medium" | "high"
    }
```

**Critério:** Áudio de baixa qualidade flagged antes da transcrição, com aviso ao usuário.

---

## A4. Marketplace de Análises (#36 do docx)

### Tabelas e API — [ ] Pendente

```sql
CREATE TABLE marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id),
  type TEXT,  -- 'checklist' | 'prompt_template' | 'agent_config'
  title TEXT,
  description TEXT,
  content JSONB,    -- item do checklist ou template de prompt
  is_public BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT false,  -- curadoria antes de publicar
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**UI em `public/marketplace.html`:**
- Grid de itens públicos com filtros por tipo e categoria
- Botão "Importar" clona o item para a conta do usuário
- Botão "Publicar" submete o item para curadoria

---

## A5. API REST Pública (#37 do docx)

### `api/routers/public_api.py` — [ ] Pendente

```python
# Autenticação por API key (gerada no painel de Settings)
# Header: Authorization: Bearer <api_key>

# Endpoints documentados:
GET  /api/v1/status                          # health check
POST /api/v1/analyze                          # envia transcrição → JSON completo
GET  /api/v1/reports/{transcription_id}       # recupera análise existente
GET  /api/v1/vendors/{vendor_id}/performance  # métricas do vendedor
GET  /api/v1/docs                             # Swagger UI (FastAPI nativo)
```

**Critério:** Request via Postman com API key retorna análise válida e documentada.

---

## A6. Gamificação (#38 do docx)

### `supabase/09_gamification.sql` — [ ] Pendente

```sql
CREATE TABLE vendor_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  vendor_name TEXT,
  badge_type TEXT,   -- 'mestre_objecoes' | 'sem_perdas' | 'top_scorer' | etc.
  awarded_at TIMESTAMPTZ DEFAULT now(),
  transcription_id UUID REFERENCES transcriptions(id)
);

CREATE TABLE vendor_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  vendor_name TEXT,
  points INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Regras de badges:**
- `mestre_objecoes`: eficácia de objeções > 80% nos últimos 10 atendimentos
- `sem_perdas`: 0 oportunidades de cross-sell ignoradas em 5 atendimentos seguidos
- `top_scorer`: checklist score ≥ 90 por 3 atendimentos consecutivos
- `detector_rapido`: tempo para primeiro produto mencionado < 60s

**Trigger:** Após `e5_persist.py` salvar análise, verificar se algum badge deve ser concedido.

---

## A7. Decisões Críticas e Gestão de Riscos (Seção 8 do docx)

> Estes pontos devem ser lembrados durante TODO o projeto, não apenas na Fase 5.

### 8.1 Migração Gradual — Sem Big Bang

O sistema anterior à refatoração continua operando enquanto o novo pipeline é validado fase a fase. Nenhuma mudança derruba o que está funcionando.

### 8.2 Schema Imutável após Fase 1

> [!WARNING]
> Os JSONs de ontologia e os schemas SQL da Fase 1 são imutáveis após início da Fase 2.
> Qualquer mudança exige: migração de dados + refatoração dos agentes + re-execução de todos os atendimentos.
> Invista o tempo necessário na revisão manual antes de codar.

### 8.3 Ontologia é Humana

> [!CAUTION]
> `checklist_zeiss_v6.json` não pode ser gerado pelo Antigravity sem revisão humana.
> Cada keyword gatilho precisa ser validada contra transcrições reais.
> Um falso positivo em `cumprimentou_cliente` distorce o score de TODOS os atendimentos.

### 8.4 Risco de Qualidade de Transcrição

**Risco principal:** role assignment incorreto no parser (E1).
- Se a transcrição não tiver marcadores de falante, o parser usa heurística posicional
- Múltiplos vendedores, terceiros ou baixa qualidade de áudio geram role errado
- Role errado invalida todo o checklist e as métricas de fala

**Mitigações:**
- `confidence_score` calculado no parser; se < 0.6 → flag `manual_review = true` em `audio_files`
- Pré-processamento de qualidade de áudio (Fase 5, A3)
- UI de revisão manual de role assignment para atendimentos flagged

---

## Checklist de Validação da Fase 5

> [!NOTE]
> Esta é a fase final. Após validação, o produto está em produção.

- [ ] Simulador gera persona e avalia resposta do vendedor com feedback
- [ ] `08_organizations.sql` executado → hierarquia de lojas criada
- [ ] Gerente de loja não vê dados de outra loja
- [ ] Gerente regional vê dados de todas as lojas da sua região
- [ ] Pré-processamento de áudio detecta baixa qualidade antes da transcrição
- [ ] Marketplace: item publicado por usuário A importado por usuário B
- [ ] API pública: request via Postman com API key retorna análise válida
- [ ] `/api/v1/docs` acessível com documentação Swagger completa
- [ ] Badge concedido automaticamente após critério atingido
- [ ] Deploy no Netlify (frontend) + Railway/Render (FastAPI) funcional
- [ ] Commit com tag `fase5-completa` — **PRODUTO EM PRODUÇÃO** 🎉
