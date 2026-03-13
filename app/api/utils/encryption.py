"""
api/utils/encryption.py — Criptografia simétrica de chaves de API
Usa Fernet (AES-128-CBC + HMAC-SHA256) da biblioteca cryptography.

A chave de criptografia fica em .env como SERVER_ENCRYPTION_KEY.
As chaves de API nunca trafegam em texto claro — apenas o frontend as envia
uma vez via HTTPS e o backend as armazena criptografadas.
"""

import os
import base64
from functools import lru_cache
from cryptography.fernet import Fernet, InvalidToken


class EncryptionError(Exception):
    pass


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    """Retorna instância Fernet usando SERVER_ENCRYPTION_KEY do ambiente."""
    raw_key = os.getenv("SERVER_ENCRYPTION_KEY", "")
    if not raw_key:
        raise EncryptionError(
            "SERVER_ENCRYPTION_KEY não definida no .env. "
            "Gere uma com: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    # Aceita tanto a chave em base64 puro quanto URL-safe base64 de 32 bytes
    try:
        return Fernet(raw_key.encode())
    except Exception as e:
        raise EncryptionError(f"SERVER_ENCRYPTION_KEY inválida: {e}") from e


def encrypt_api_key(plain_key: str) -> str:
    """
    Criptografa uma chave de API em texto plano.
    Retorna string base64 URL-safe (segura para armazenar no banco).
    """
    if not plain_key or not plain_key.strip():
        raise EncryptionError("Chave vazia não pode ser criptografada.")
    fernet = _get_fernet()
    return fernet.encrypt(plain_key.encode("utf-8")).decode("utf-8")


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Descriptografa uma chave de API armazenada no banco.
    Lança EncryptionError se a chave foi adulterada ou o SERVER_ENCRYPTION_KEY mudou.
    """
    if not encrypted_key:
        raise EncryptionError("Chave criptografada vazia.")
    try:
        fernet = _get_fernet()
        return fernet.decrypt(encrypted_key.encode("utf-8")).decode("utf-8")
    except InvalidToken as e:
        raise EncryptionError(
            "Falha ao descriptografar: chave adulterada ou SERVER_ENCRYPTION_KEY incorreta."
        ) from e


def make_key_hint(plain_key: str) -> str:
    """Retorna os últimos 4 caracteres para exibição ao usuário (ex: '...XkP9')."""
    if len(plain_key) < 4:
        return "****"
    return f"...{plain_key[-4:]}"


def generate_encryption_key() -> str:
    """Utilitário para gerar uma SERVER_ENCRYPTION_KEY nova. Use no setup inicial."""
    return Fernet.generate_key().decode()
