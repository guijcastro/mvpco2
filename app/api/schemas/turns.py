"""
api/schemas/turns.py — Pydantic schemas para o parser E1 (spaCy)
Representa turnos da conversa após parsing da transcrição.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from enum import Enum


class SpeakerRole(str, Enum):
    VENDEDOR = "VENDEDOR"
    CLIENTE = "CLIENTE"
    TERCEIRO = "TERCEIRO"


class ParsingMethod(str, Enum):
    MARKER = "marker"           # marcadores explícitos (Vendedor:, Cliente:)
    POSITIONAL = "positional"   # heurística posicional (sem marcadores)
    HYBRID = "hybrid"           # combinação dos dois


class ConversationTurn(BaseModel):
    turn_index: int = Field(..., ge=0, description="Índice sequencial do turno (0-based)")
    role: SpeakerRole
    text: str = Field(..., min_length=1)
    char_start: int = Field(..., ge=0, description="Offset de caractere no texto original")
    char_end: int = Field(..., ge=0)
    token_count: int = Field(default=0, ge=0)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0,
                              description="Confiança do parser para este turno específico")

    @field_validator("char_end")
    @classmethod
    def end_after_start(cls, v, info):
        if "char_start" in info.data and v <= info.data["char_start"]:
            raise ValueError("char_end deve ser maior que char_start")
        return v

    @property
    def word_count(self) -> int:
        return len(self.text.split())


class ParsedTranscription(BaseModel):
    """Resultado completo do E1 — parser de transcrição."""
    raw_text: str = Field(..., description="Texto original da transcrição")
    turns: list[ConversationTurn] = Field(default_factory=list)
    parsing_method: ParsingMethod
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Confiança geral do parsing (< 0.6 → manual_review)"
    )
    manual_review: bool = Field(
        default=False,
        description="True se confidence_score < 0.6 ou caso extremo detectado"
    )
    vendor_turn_count: int = Field(default=0, ge=0)
    client_turn_count: int = Field(default=0, ge=0)
    total_turns: int = Field(default=0, ge=0)
    vendor_token_ratio: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Proporção de tokens do vendedor (métrica de equilíbrio da conversa)"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Avisos gerados durante o parsing (ex: 'terceiro detectado', 'baixa confiança')"
    )

    def model_post_init(self, __context):
        """Calcula campos derivados após inicialização."""
        self.total_turns = len(self.turns)
        self.vendor_turn_count = sum(1 for t in self.turns if t.role == SpeakerRole.VENDEDOR)
        self.client_turn_count = sum(1 for t in self.turns if t.role == SpeakerRole.CLIENTE)

        vendor_tokens = sum(t.token_count for t in self.turns if t.role == SpeakerRole.VENDEDOR)
        total_tokens = sum(t.token_count for t in self.turns)
        self.vendor_token_ratio = vendor_tokens / total_tokens if total_tokens > 0 else 0.0

    def get_turns_by_role(self, role: SpeakerRole) -> list[ConversationTurn]:
        return [t for t in self.turns if t.role == role]

    def get_turn_window(self, start: int, end: int) -> list[ConversationTurn]:
        """Retorna turnos de índice start até end (inclusive)."""
        return [t for t in self.turns if start <= t.turn_index <= end]
