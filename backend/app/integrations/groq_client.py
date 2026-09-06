import logging
import httpx
from typing import Any, Dict, Optional
from app.config.settings import settings

logger = logging.getLogger("nyayavault.groq")


class GroqService:
    """Groq Cloud API integration for ultra-fast LLM inference (Llama 3.3 70B / Llama 3.1)"""

    GROQ_BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.default_model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Executes LLM chat completion using Groq API"""
        target_model = model or self.default_model

        if not self.api_key:
            logger.info("GROQ_API_KEY not configured. Utilizing deterministic AI mock completion.")
            return {
                "text": f"[Groq LLM Mock Response]: Processed prompt using model {target_model}.",
                "model": target_model,
                "status": "MOCK",
            }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": target_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.GROQ_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return {
                        "text": content,
                        "model": target_model,
                        "status": "SUCCESS",
                        "usage": data.get("usage", {}),
                    }
                else:
                    logger.error(f"Groq API returned error status {res.status_code}: {res.text}")
                    return {
                        "text": f"Groq API error ({res.status_code}): {res.text}",
                        "model": target_model,
                        "status": "ERROR",
                    }
        except Exception as e:
            logger.error(f"Groq API connection exception: {e}")
            return {
                "text": f"Groq connection exception: {str(e)}",
                "model": target_model,
                "status": "EXCEPTION",
            }


groq_service = GroqService()
