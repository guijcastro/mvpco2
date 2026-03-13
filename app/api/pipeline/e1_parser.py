"""
api/pipeline/e1_parser.py — NLP Parser (Fase B)
Extrai e estrutura turnos de diálogo a partir de transcrições brutas.
"""

import re
import logging
from typing import List, Tuple
from schemas.turns import ConversationTurn, ParsedTranscription, SpeakerRole, ParsingMethod

logger = logging.getLogger("mvpco.parser")

class TranscriptionParser:
    def __init__(self, nlp_model=None):
        """
        Recebe a instância do spaCy injetada via AppState ou carrega sob demanda.
        """
        self.nlp = nlp_model
        
        # Expressão regular hiper-robusta para capturar blocos indicando locutores:
        # Aceita: "Vendedor:", "Cliente -", "[VENDEDOR]", "Vendedor (rindo):", etc.
        self.marker_regex = re.compile(
            r'(?i)^\s*\[?(vendedor|atendente|consultor|cliente|consumidor|paciente|terceiro)\]?\s*'
            r'(?:\([^)]+\))?\s*[-:]?\s*',
            re.MULTILINE
        )

    def parse(self, raw_text: str) -> ParsedTranscription:
        """
        Ponto de entrada do Motor E1.
        """
        if not raw_text or not raw_text.strip():
            logger.warning("Parser E1 recebeu texto vazio.")
            return ParsedTranscription(
                raw_text="",
                turns=[],
                parsing_method=ParsingMethod.POSITIONAL,
                confidence_score=0.0,
                manual_review=True,
                warnings=["Texto vazio fornecido para transcrição."]
            )

        # Normalization
        text = raw_text.strip()
        
        # 1. Tentar extração por Marcadores Explícitos
        turns, method = self._extract_by_markers(text)
        
        # 2. Se falhar, Tentar extração Posicional (Heurística de Alternância por Quebras de Linha)
        if not turns:
            turns, method = self._extract_by_alternation(text)
            
        # 3. Processamento de Metadados e Confiança
        return self._build_parsed_transcription(text, turns, method)

    def _extract_by_markers(self, text: str) -> Tuple[List[ConversationTurn], ParsingMethod]:
        """
        Extrai turnos utilizando Regex para buscar Vendedor e Cliente explicitamente grafados.
        """
        matches = list(self.marker_regex.finditer(text))
        if not matches:
            return [], ParsingMethod.POSITIONAL

        turns = []
        for i, match in enumerate(matches):
            role_str = match.group(1).lower()
            
            # Mapeamento do role
            if role_str in ['vendedor', 'atendente', 'consultor']:
                role = SpeakerRole.VENDEDOR
            elif role_str in ['cliente', 'consumidor', 'paciente']:
                role = SpeakerRole.CLIENTE
            else:
                role = SpeakerRole.TERCEIRO

            start_block = match.end()
            end_block = matches[i+1].start() if i + 1 < len(matches) else len(text)
            
            block_text = text[start_block:end_block].strip()
            if not block_text:
                continue
                
            token_count = self._count_tokens(block_text)
            
            turns.append(ConversationTurn(
                turn_index=len(turns),
                role=role,
                text=block_text,
                char_start=start_block,
                char_end=start_block + len(block_text),
                token_count=token_count,
                confidence=0.95 # Alta confiança quando há marcadores claros
            ))
            
        return turns, ParsingMethod.MARKER

    def _extract_by_alternation(self, text: str) -> Tuple[List[ConversationTurn], ParsingMethod]:
        """
        Quando não há marcadores, quebra por linhas vazias duplas (\n\n) ou simples
        e assume alternância Vendedor -> Cliente -> Vendedor...
        """
        # Se houver parágrafos duplos, separamos por eles, senão por linhas simples
        if '\n\n' in text:
            blocks = [b.strip() for b in text.split('\n\n') if b.strip()]
        else:
            blocks = [b.strip() for b in text.split('\n') if b.strip()]

        turns = []
        current_offset = 0
        
        for i, block_text in enumerate(blocks):
            # Encontrar char_start com base na busca do bloco no texto restante para exatidão
            start_idx = text.find(block_text, current_offset)
            if start_idx == -1:
                start_idx = current_offset # Fallback de proteção
                
            role = SpeakerRole.VENDEDOR if i % 2 == 0 else SpeakerRole.CLIENTE
            token_count = self._count_tokens(block_text)
            
            # Penalidade de confiança se blocos são pequenos demais e alternam demais
            confidence = 0.70 if len(blocks) > 1 else 0.40
            
            turns.append(ConversationTurn(
                turn_index=len(turns),
                role=role,
                text=block_text,
                char_start=start_idx,
                char_end=start_idx + len(block_text),
                token_count=token_count,
                confidence=confidence
            ))
            current_offset = start_idx + len(block_text)

        return turns, ParsingMethod.POSITIONAL

    def _count_tokens(self, text: str) -> int:
        if self.nlp:
            try:
                # Usar o spaCy para contar tokens reais
                doc = self.nlp(text)
                return len([token for token in doc if not token.is_punct and not token.is_space])
            except Exception as e:
                logger.warning(f"Erro no spaCy ao contar tokens, fallback ativado: {e}")
        
        # Fallback ultra-leve baseado em split de espaços
        return len(text.split())

    def _build_parsed_transcription(self, raw_text: str, turns: List[ConversationTurn], method: ParsingMethod) -> ParsedTranscription:
        """
        Agrupa os turnos no objeto final, calcula a confiança global e emite alertas se a performance for ruim.
        """
        if not turns:
            return ParsedTranscription(
                raw_text=raw_text,
                parsing_method=method,
                confidence_score=0.1,
                manual_review=True,
                warnings=["Nenhum turno pôde ser extraído."]
            )

        avg_confidence = sum(t.confidence for t in turns) / len(turns)
        warnings = []
        manual_review = False
        
        # Penalizações de confiança
        if len(turns) == 1:
            warnings.append("Monólogo detectado. Não houve alternância de diálogos.")
            avg_confidence = min(avg_confidence, 0.4)
            manual_review = True
            
        if any(t.role == SpeakerRole.TERCEIRO for t in turns):
            warnings.append("Terceira pessoa detectada na conversa. A análise pode estar poluída.")
            
        if avg_confidence < 0.6:
            warnings.append("Baixa confiança na separação dos diálogos (ausência de marcadores visuais precisos).")
            manual_review = True

        return ParsedTranscription(
            raw_text=raw_text,
            turns=turns,
            parsing_method=method,
            confidence_score=avg_confidence,
            manual_review=manual_review,
            warnings=warnings
        )

# Instância Singleton leve para importação facilitada
_parser_instance = None

def get_parser(nlp=None) -> TranscriptionParser:
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = TranscriptionParser(nlp_model=nlp)
    elif nlp is not None and _parser_instance.nlp is None:
        # Faz bridge do spaCy caso a instância global ainda não o tenha
        _parser_instance.nlp = nlp
    return _parser_instance
