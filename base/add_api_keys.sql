-- Script Seguro para Adicionar as Chaves Anthropic e xAI
-- Este script APENAS ADICIONA as colunas caso elas não existam.
-- Ele NUNCA apaga, substitui ou modifica os dados existentes.

ALTER TABLE IF EXISTS user_settings 
ADD COLUMN IF NOT EXISTS anthropic_key text;

ALTER TABLE IF EXISTS user_settings 
ADD COLUMN IF NOT EXISTS xai_key text;
