import pytest
from pipeline.e1_parser import TranscriptionParser, get_parser
from schemas.turns import SpeakerRole, ParsingMethod

class MockToken:
    def __init__(self, is_punct, is_space):
        self.is_punct = is_punct
        self.is_space = is_space

def mock_nlp(text):
    return [MockToken(False, False) for _ in text.split()]

@pytest.fixture
def parser():
    return TranscriptionParser(nlp_model=mock_nlp)

# --- 10 CENÁRIOS RÍGOROSOS (Etapa 5) ---

@pytest.mark.parametrize("scenario,raw_text,expected_turns,expected_method,expect_review", [
    (
        "1. Marcadores perfeitos", 
        "Vendedor: Oi\nCliente: Tudo bem?", 
        2, ParsingMethod.MARKER, False
    ),
    (
        "2. Monólogo sem alternância", 
        "Tudo bem, a receita está aqui, eu queria ver uma armação de metal, aquela redonda.", 
        1, ParsingMethod.POSITIONAL, True
    ),
    (
        "3. Alternância dupla \n\n (Positional)", 
        "Boa tarde senhor.\n\nBoa tarde, queria ver óculos.\n\nCerto, vou pegar.", 
        3, ParsingMethod.POSITIONAL, False
    ),
    (
        "4. Alternância simples \n (Positional)", 
        "Oi.\nOi.\nTem óculos?\nSim.", 
        4, ParsingMethod.POSITIONAL, False
    ),
    (
        "5. Marcadores em colchetes e traços", 
        "[Vendedor] - Olá\n[Cliente] - Oi", 
        2, ParsingMethod.MARKER, False
    ),
    (
        "6. Identificação de Terceiro", 
        "Vendedor: Oi.\nTerceiro: Eu sou a esposa dele.\nCliente: Isso.", 
        3, ParsingMethod.MARKER, False # Terceiro é suportado, mas gera warning. Não obriga review necessariamente, vamos checar assert customizado
    ),
    (
        "7. Marcadores grudados no texto", 
        "Vendedor:Oi\nCliente:Tudo bem?", 
        2, ParsingMethod.MARKER, False
    ),
    (
        "8. Vendedor com parênteses (ação)",
        "Vendedor (sorrindo): Olá!\nCliente: Oi.",
        2, ParsingMethod.MARKER, False
    ),
    (
        "9. Nomes similares mapeados",
        "Atendente: Posso ajudar?\nConsumidor: Sim.\nConsultor: Sou eu.",
        3, ParsingMethod.MARKER, False
    ),
    (
        "10. Texto Vazio ou Quebrado",
        "   \n  \t  ",
        0, ParsingMethod.POSITIONAL, True
    )
])
def test_10_exhaustive_scenarios(parser, scenario, raw_text, expected_turns, expected_method, expect_review):
    res = parser.parse(raw_text)
    assert len(res.turns) == expected_turns, f"Falha no cenário {scenario}: {len(res.turns)} != {expected_turns}"
    assert res.parsing_method == expected_method, f"Método errado no {scenario}"
    assert res.manual_review == expect_review, f"Review errado no {scenario}"

def test_terceiro_warning(parser):
    res = parser.parse("Vendedor: Oi.\nTerceiro: Oi.\nCliente: Oi.")
    assert any("Terceira pessoa" in w for w in res.warnings)

def test_extract_by_alternation_roles(parser):
    res = parser.parse("Vendedor\n\nCliente\n\nVendedor") # Simulando textos longos com double newline
    assert res.turns[0].role == SpeakerRole.VENDEDOR
    assert res.turns[1].role == SpeakerRole.CLIENTE
    assert res.turns[2].role == SpeakerRole.VENDEDOR
