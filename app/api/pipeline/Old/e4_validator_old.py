import os
import instructor
import json
from openai import AsyncOpenAI
from google import genai
from pydantic import BaseModel, ValidationError

# Obter as chaves das variáveis de ambiente ou cache seguro (em dev)
# Aqui será injetado dinamicamente durante a execução da request

async def call_llm_with_schema(
    prompt: str, 
    schema_class: type[BaseModel], 
    model: str = "gemini-2.5-pro",
    max_retries: int = 2
) -> BaseModel:
    """
    E4: Wrapper Central de Validação Pydantic.
    Garante que qualquer resposta do modelo LLM seja mapeada perfeitamente na classe Pydantic.
    Se falhar, faz retentativa.
    """
    for attempt in range(max_retries + 1):
        try:
            if "gemini" in model.lower():
                # Instanciar dinamicamente para capturar a chave injetada pela request atual
                client_gemini = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "disabled"))
                
                # Chamada nativa Gemini 2.5 Structured Output
                response = await client_gemini.aio.models.generate_content(
                    model='gemini-2.5-pro',
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": schema_class,
                        "temperature": 0.1
                    },
                )
                # Parse seguro do output nativo JSON
                return schema_class.model_validate_json(response.text)
                
            else:
                # Instanciar dinamicamente para OpenAI
                async_client_openai = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", "disabled"))
                instructor_openai = instructor.from_openai(async_client_openai)
                
                # Fallback para OpenAI Whisper/GPT
                response = await instructor_openai.chat.completions.create(
                    model="gpt-4o-mini",
                    response_model=schema_class,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1
                )
                return response
                
        except ValidationError as e:
            if attempt == max_retries:
                raise e # Estourou retentativas
            # Reprompt silencioso: Informar ao modelo que ele errou o Schema e pedir correção
            prompt += f"\n\n[SISTEMA] Sua última resposta falhou no schema Pydantic. Erro: {str(e)}. Corrija e retorne apenas JSON estruturado."
            
        except Exception as e:
            if attempt == max_retries:
                raise e
    
    raise ValueError("Falha catastrófica ao chamar LLM no orquestrador.")

def validate_and_consolidate(e2_output: dict, agents_output: dict) -> dict:
    """
    Função final do E4 que agrega tudo na FullAnalysisOutput.
    Como os agentes já validam Pydantic internamente na `call_llm_with_schema`,
    só precisamos serializar a árvore gigante no final para salvar no BD.
    """
    from schemas.analysis import FullAnalysisOutput
    
    # Montar o obj (Isso será preenchido adequadamente à medida que A1-A7 retornarem)
    # Por enquanto devolvemos um stub consolidado pra testes do E5
    return {"status": "validated_pydantic", "payload": agents_output}
