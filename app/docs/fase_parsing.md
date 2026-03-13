# FASE B — Parsing: Testes, Experimentação e Validação

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Esta fase é executada **após a Fase A** e antes da Fase 2.

## Status

🔴 **NÃO INICIADA**

## Posição no Plano

**Fase A (Benchmark IA) → FASE B (esta) → Fase 2 (Pipeline)**

## Objetivo

Garantir que o `e1_parser.py` é robusto o suficiente para o mundo real antes de construir todo o pipeline sobre ele. Um erro de role assignment corrompre toda análise downstream. Esta fase testa, mede e itera até atingir ≥ 90% de accuracy de role assignment com 10+ transcrições reais.

> [!WARNING]
> O parser é o alicerce do produto. Se VENDEDOR e CLIENTE ficam trocados, o checklist, as métricas de fala e as objeções ficam todos errados.
> Não avance para a Fase 2 sem accuracy ≥ 90% confirmada com transcrições reais do projeto.

---

## Corpus de Teste

### Construção do dataset — [ ] Pendente (**MANUAL**)

Colleta de transcrições para testar, organizadas por tipo de dificuldade:

```
api/tests/parsing/corpus/
├── easy/          ← Com marcadores explícitos (Vendedor:, Cliente:)
│   ├── atendimento_01.txt
│   ├── atendimento_02.txt
│   └── atendimento_03.txt
├── medium/        ← Marcadores parciais ou informais (V:, C:, "atendente:")
│   ├── atendimento_04.txt
│   └── atendimento_05.txt
├── hard/          ← Sem marcadores — heurística posicional
│   ├── atendimento_06.txt
│   └── atendimento_07.txt
└── edge/          ← Casos extremos: múltiplos vendedores, terceiro na conversa, áudio ruim
    ├── atendimento_08.txt   ← dois vendedores na mesma loja
    ├── atendimento_09.txt   ← cliente acompanhado (cônjuge fala também)
    └── atendimento_10.txt   ← transcrição de baixa qualidade (palavras erradas)
```

**Para cada transcrição, criar também o ground truth:**

```
api/tests/parsing/ground_truth/
├── atendimento_01.json   ← [{turn_index: 0, role: "VENDEDOR", text: "..."}, ...]
└── ...
```

> [!IMPORTANT]
> Os ground truths são criados **manualmente** pelo usuário. São a referência de ouro para calcular accuracy.

---

## Suite de Testes

### `api/tests/parsing/test_e1_parser.py` — [ ] Pendente

```python
"""
Suite completa de testes do e1_parser.py.
Cobertura:
- Regex de marcadores explícitos (VENDEDOR:, Cliente:, V:, C:)
- Heurística posicional (parágrafos alternados)
- Normalização de texto (contrações, ruídos, pontuação)
- Score de confiança
- Casos extremos
"""
import pytest
import json
from pathlib import Path
from api.pipeline.e1_parser import parse_transcription
import spacy

nlp = spacy.load("pt_core_news_lg")

CORPUS_PATH = Path("api/tests/parsing/corpus")
GT_PATH = Path("api/tests/parsing/ground_truth")

# ─── Testes unitários de componentes ───────────────────────────────────────

class TestMarkerDetection:
    """Testa a detecção de marcadores explícitos de falante."""

    def test_vendedor_c_format(self):
        """Formato 'Vendedor:' detectado corretamente."""
        text = "Vendedor: Boa tarde, posso ajudar?\nCliente: Sim, quero ver óculos progressivos."
        result = parse_transcription(text, nlp)
        assert result.turns[0].role == "VENDEDOR"
        assert result.turns[1].role == "CLIENTE"
        assert result.confidence_score >= 0.9

    def test_abbreviated_v_c_format(self):
        """Formato 'V:' e 'C:' detectado corretamente."""
        text = "V: Olá, bem-vindo!\nC: Obrigado, estou procurando uma lente progressiva.\nV: Claro, vem cá que eu te ajudo."
        result = parse_transcription(text, nlp)
        assert all(t.role == "VENDEDOR" for t in result.turns if result.turns.index(t) % 2 == 0)
        assert result.confidence_score >= 0.85

    def test_atendente_as_vendedor(self):
        """Transcrição com 'Atendente:' deve mapear para VENDEDOR."""
        text = "Atendente: Boa tarde!\nCliente: Boa tarde, gostaria de ver lentes Zeiss."
        result = parse_transcription(text, nlp)
        assert result.turns[0].role == "VENDEDOR"

    def test_mixed_case_markers(self):
        """Marcadores com capitalização mista: 'vendedor:', 'CLIENTE:'."""
        text = "vendedor: Boa tarde!\nCLIENTE: Olá, vim ver os óculos."
        result = parse_transcription(text, nlp)
        assert result.turns[0].role == "VENDEDOR"
        assert result.turns[1].role == "CLIENTE"

    def test_no_markers_positional_fallback(self):
        """Sem marcadores: parser usa heurística posicional."""
        text = "Boa tarde, posso ajudar?\nSim, quero ver óculos.\nClaro, qual graduação?"
        result = parse_transcription(text, nlp)
        assert result.confidence_score < 0.6
        assert result.manual_review == True
        assert len(result.turns) == 3

    def test_third_party_speaker(self):
        """Terceiro na conversa é marcado como TERCEIRO, não contamina V/C."""
        text = "Vendedor: Boa tarde!\nCliente: Boa tarde, trouxe minha filha também.\nFilha: Oi!\nVendedor: Olá! Seja bem-vinda."
        result = parse_transcription(text, nlp)
        terceiros = [t for t in result.turns if t.role == "TERCEIRO"]
        assert len(terceiros) >= 1


class TestTextNormalization:
    """Testa a normalização de texto pelos turnos."""

    def test_removes_filler_noise(self):
        """Ruídos de transcrição (ininteligível, incompreensível) são removidos."""
        text = "Vendedor: [ininteligível] então a lente é [incompreensível] de qualidade.\nCliente: Entendi."
        result = parse_transcription(text, nlp)
        assert "[ininteligível]" not in result.turns[0].text

    def test_token_count_populated(self):
        """Cada turno deve ter token_count > 0."""
        text = "Vendedor: Olá, posso ajudar?\nCliente: Sim, quero ver lentes."
        result = parse_transcription(text, nlp)
        assert all(t.token_count > 0 for t in result.turns)

    def test_char_offsets_correct(self):
        """char_start e char_end de cada turno devem ser consistentes com o texto original."""
        text = "Vendedor: Olá!\nCliente: Oi!"
        result = parse_transcription(text, nlp)
        for turn in result.turns:
            assert turn.char_start >= 0
            assert turn.char_end > turn.char_start


class TestConfidenceScore:
    """Testa o cálculo de confidence_score."""

    def test_high_confidence_with_all_markers(self):
        """Todos os turnos com marcadores → confidence ≥ 0.9."""
        text = "\n".join([
            f"{'Vendedor' if i % 2 == 0 else 'Cliente'}: Turno {i}."
            for i in range(10)
        ])
        result = parse_transcription(text, nlp)
        assert result.confidence_score >= 0.9
        assert result.manual_review == False

    def test_low_confidence_triggers_manual_review(self):
        """Sem marcadores → confidence < 0.6 → manual_review = True."""
        text = "Boa tarde.\nOlá.\nPosso ver as lentes?\nClaro, venha."
        result = parse_transcription(text, nlp)
        assert result.manual_review == True


# ─── Testes de integração com corpus completo ──────────────────────────────

def load_corpus_and_gt():
    """Carrega todos os pares (transcrição, ground_truth) do corpus."""
    pairs = []
    for txt_path in sorted(CORPUS_PATH.rglob("*.txt")):
        gt_path = GT_PATH / txt_path.with_suffix(".json").name
        if gt_path.exists():
            pairs.append((txt_path.read_text(encoding="utf-8"),
                          json.loads(gt_path.read_text(encoding="utf-8"))))
    return pairs

def compute_accuracy(predicted_turns: list, ground_truth: list) -> float:
    """
    Calcula accuracy de role assignment por turno.
    Role correto / total de turnos (alinhados por turn_index).
    """
    correct = 0
    total = min(len(predicted_turns), len(ground_truth))
    for i in range(total):
        if predicted_turns[i].role == ground_truth[i]["role"]:
            correct += 1
    return correct / total if total > 0 else 0.0

class TestCorpusAccuracy:
    """
    Testa accuracy de role assignment com o corpus de transcrições reais.
    Executa somente se o corpus existir (skip automático se vazio).
    """

    def test_easy_corpus_accuracy(self):
        """Corpus 'easy' (marcadores explícitos) deve ter accuracy = 100%."""
        pairs = [(t, gt) for t, gt in load_corpus_and_gt()
                 if "easy" in str(CORPUS_PATH / "easy")]
        if not pairs:
            pytest.skip("Corpus easy vazio")
        for text, gt in pairs:
            result = parse_transcription(text, nlp)
            acc = compute_accuracy(result.turns, gt)
            assert acc == 1.0, f"Expected 100% accuracy in easy corpus, got {acc:.1%}"

    def test_overall_accuracy_above_90_percent(self):
        """Accuracy geral sobre TODO o corpus deve ser ≥ 90%."""
        pairs = load_corpus_and_gt()
        if not pairs:
            pytest.skip("Corpus vazio")
        accs = []
        for text, gt in pairs:
            result = parse_transcription(text, nlp)
            accs.append(compute_accuracy(result.turns, gt))
        overall = sum(accs) / len(accs)
        assert overall >= 0.90, f"Overall accuracy {overall:.1%} < 90% threshold"

    def test_hard_corpus_uses_positional_fallback(self):
        """Corpus 'hard' (sem marcadores) deve acionar parsing posicional."""
        hard_path = CORPUS_PATH / "hard"
        if not hard_path.exists():
            pytest.skip("Corpus hard vazio")
        for txt_path in hard_path.glob("*.txt"):
            result = parse_transcription(txt_path.read_text(encoding="utf-8"), nlp)
            assert result.parsing_method == "positional"
            assert result.confidence_score < 0.6

    def test_edge_multiple_vendors(self):
        """Caso extremo: dois vendedores. Parser deve sinalizar manual_review."""
        edge_path = CORPUS_PATH / "edge"
        if not edge_path.exists():
            pytest.skip("Corpus edge vazio")
        for txt_path in edge_path.glob("*.txt"):
            result = parse_transcription(txt_path.read_text(encoding="utf-8"), nlp)
            # Edge cases devem sempre disparar manual_review
            assert result.manual_review == True, f"{txt_path.name} didn't trigger manual_review"
```

---

## Métricas de Qualidade (a preencher após testes)

```
PARSER ACCURACY REPORT — MVPCO
═══════════════════════════════════════════════════════
Categoria       Transcrições  Accuracy  Manual Review
───────────────────────────────────────────────────────
easy            3             __%        __%
medium          2             __%        __%
hard            2             __%        __%
edge            3             __%        __%
────────────────────────────────────────────────────────
OVERALL         10            __%        __%  ← meta: ≥ 90%
═══════════════════════════════════════════════════════
```

---

## Experimentos de Melhoria (se accuracy < 90%)

### Experimento 1 — Expansão do dicionário de marcadores — [ ] Condicional

Se marcadores alternativos são usados nas transcrições reais (ex: `"Func:"`, `"Atend:"`, `"Lojista:"`), adicionar em `e1_parser.py`:

```python
VENDEDOR_MARKERS = [
    r"^(Vendedor|V|Atendente|Atend|Func|Funcionário|Lojista|Óptico)\s*:",
]
```

### Experimento 2 — Pesos de heurística posicional — [ ] Condicional

Se o fallback posicional está errando, ajustar os critérios:
- Parágrafos com ≥ 10 tokens → mais peso como ponto de início de turno
- Parágrafos com "?" no final → provavelmente cliente
- Parágrafos com produtos/marcas → provavelmente vendedor

### Experimento 3 — spaCy Diarização com NER — [ ] Condicional

Se heurística posicional ainda < 85%, usar spaCy NER para identificar possíveis marcadores:
- Entidades `PER` (pessoa) próximas de `:` → potencial speaker label
- Integrar com `pyannote.audio` para diarização por áudio (se timing disponível)

### Experimento 4 — spaCy Dependency Parsing para Detecção de Perguntas — [ ] Condicional

Melhorar detecção de `open_questions_by_seller` em E2:

```python
def is_open_question(text: str, doc) -> bool:
    """
    Pergunta aberta = turno do vendedor com:
    - Verbo interrogativo no início (qual, como, quando, onde, por que) OU
    - Marcador de entonação (?) E root verbal + ≥ 5 tokens
    Usa dependency parsing do spaCy.
    """
    has_question_mark = "?" in text
    root = [t for t in doc if t.dep_ == "ROOT"]
    interrogative_words = {"qual", "como", "quando", "onde", "quem", "por que", "quanto"}
    starts_with_interrogative = doc[0].text.lower() in interrogative_words
    return has_question_mark and len(doc) >= 5 and (starts_with_interrogative or (root and root[0].pos_ == "VERB"))
```

---

## Novas Exigências de Execução (Fase B Estendida)

Conforme comando direto do usuário, as seguintes sub-tarefas de software devem ser implementadas antes da aprovação da Fase B. Nenhuma alteração no plano base foi feita, apenas estas adições cirúrgicas:

1. **Front-end com Progresso Visível:** O arquivo `upload.html` deve mostrar o progresso real e as atividades que estão acontecendo no servidor.
2. **Seleção de Motor de Transcrição:** A aplicação deve oferecer no front e no back a capacidade de transcrição pelo:
   - `Whisper API` (OpenAI).
   - `Gemini 2.5` (Google API).
   - **Versão Local (Python):** [EM ABERTO - Suspenso] Usando `whisper` local e integrando `pyannote.audio` para diarização de locutores nativa direto do file de áudio.
3. **Pós-processamento Visual do Parser:** O front-end precisa renderizar visualmente cada etapa executada pelo `e1_parser.py`, para que o usuário entenda o que está sendo desmembrado (visualizando os blocos VENDEDOR e CLIENTE em tela e suas confianças).

---

## Executar os testes

```bash
# Instalar dependências de teste
pip install pytest pytest-asyncio

# Rodar suite completa
cd MVPCO/base
pytest api/tests/parsing/test_e1_parser.py -v

# Rodar apenas a categoria de corpus:
pytest api/tests/parsing/test_e1_parser.py::TestCorpusAccuracy -v

# Gerar relatório de cobertura
pytest api/tests/parsing/ --cov=api/pipeline/e1_parser --cov-report=term-missing
```

---

## Checklist de Validação da Fase B

> [!CAUTION]
> **A Fase 2 só começa após TODOS os itens confirmados.**

- [ ] Corpus de 10+ transcrições reais criado em `api/tests/parsing/corpus/`
- [ ] Ground truths criados manualmente em `api/tests/parsing/ground_truth/`
- [ ] `test_e1_parser.py` rodando: todos os testes unitários passam
- [ ] **Accuracy geral ≥ 90%** confirmada sobre o corpus completo
- [ ] Corpus `easy` (marcadores explícitos): 100% de accuracy
- [ ] Corpus `edge` (casos extremos): todos disparam `manual_review = True`
- [ ] Relatório de accuracy preenchido na tabela acima
- [ ] Se accuracy < 90%: experimentos de melhoria aplicados e retestados
- [ ] `e1_parser.py` finalizado e congelado — não modificar durante a Fase 2
- [ ] Commit com tag `fase-parsing-completa`

**→ Quando validado, avançar para [docs/fase2.md](fase2.md)**
