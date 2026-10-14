"""
llm_provider.py
Central LLM abstraction for Smart Scribes.

Supports two providers:
  - "aws"    → AWS Bedrock (Claude) via boto3
  - "gemini" → Google Generative AI

Set DEFAULT_LLM_PROVIDER in your .env to switch globally.
All pipeline scripts import from here instead of hard-coding a provider.
"""

import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

# ─── provider selection ────────────────────────────────────────────────
DEFAULT_PROVIDER = os.getenv("DEFAULT_LLM_PROVIDER", "aws")

# ─── AWS Bedrock helpers ───────────────────────────────────────────────
_bedrock_client = None

def _get_bearer_token() -> str | None:
    return (
        os.getenv("AWS_BEARER_TOKEN_BEDROCK")
        or os.getenv("BEDROCK_API_KEY")
        or os.getenv("AWS_BEDROCK_API_KEY")
    )

def _bedrock_http_generate(
    prompt: str,
    bearer_token: str,
    model_id: str,
    region: str,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Invoke Bedrock endpoint directly using HTTP with Bearer Token (Bedrock API Key)."""
    import urllib.request
    import urllib.error

    url = f"https://bedrock-runtime.{region}.amazonaws.com/model/{model_id}/converse"
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        "inferenceConfig": {
            "maxTokens": max_tokens,
            "temperature": temperature,
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {bearer_token}",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["output"]["message"]["content"][0]["text"]
    except urllib.error.HTTPError as e:
        # Fallback to /invoke endpoint if /converse is not supported on this model
        fallback_url = f"https://bedrock-runtime.{region}.amazonaws.com/model/{model_id}/invoke"
        invoke_payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        invoke_req = urllib.request.Request(
            fallback_url,
            data=json.dumps(invoke_payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {bearer_token}",
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(invoke_req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return "".join(b["text"] for b in data.get("content", []) if b.get("type") == "text")
        except Exception as inner_e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                pass
            raise RuntimeError(f"Bedrock API Key error: {e}. Details: {err_body or inner_e}")


def _get_bedrock_client():
    """Lazy-init a Bedrock Runtime client for AWS IAM SigV4."""
    global _bedrock_client
    if _bedrock_client is None:
        import boto3
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
    return _bedrock_client


def bedrock_generate(
    prompt: str,
    *,
    model_id: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Send a prompt to AWS Bedrock (Claude) using Bedrock API Key or AWS credentials."""
    model_id = model_id or os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
    region = os.getenv("AWS_REGION", "us-east-1")
    bearer_token = _get_bearer_token()

    # If Bedrock API Key (Bearer Token) is provided, use direct bearer auth
    if bearer_token and bearer_token != "your-bedrock-api-key":
        return _bedrock_http_generate(
            prompt,
            bearer_token=bearer_token,
            model_id=model_id,
            region=region,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    # Otherwise fallback to AWS IAM credentials via boto3
    client = _get_bedrock_client()
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    })

    response = client.invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=body,
    )
    result = json.loads(response["body"].read())
    return "".join(block["text"] for block in result.get("content", []) if block.get("type") == "text")



# ─── Google Gemini helpers ─────────────────────────────────────────────
_gemini_client = None

def _get_gemini_client():
    """Initialize genai.Client with Vertex AI or API key."""
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        creds_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_file and not os.path.isabs(creds_file):
            candidate = os.path.join(os.path.dirname(__file__), creds_file)
            if os.path.exists(candidate):
                creds_file = candidate
            else:
                candidate_root = os.path.join(os.path.dirname(__file__), "..", creds_file)
                if os.path.exists(candidate_root):
                    creds_file = candidate_root
        if creds_file and os.path.exists(creds_file):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(creds_file)
            project = os.getenv("GCP_PROJECT_ID")
            if not project:
                # Fall back to the project the service account belongs to.
                with open(creds_file, "r", encoding="utf-8") as f:
                    project = json.load(f).get("project_id")
            _gemini_client = genai.Client(
                vertexai=True,
                project=project,
                location=os.getenv("GCP_LOCATION", "us-central1")
            )
        else:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def gemini_generate(
    prompt: str,
    *,
    model_name: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    safety_settings: list | None = None,
) -> str:
    """Send a single-turn text prompt to Google Gemini and return the text."""
    from google.genai import types

    model_name = model_name or os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash")
    client = _get_gemini_client()
    # max_tokens is deliberately not forwarded: Gemini thinking models count "thinking"
    # tokens against max_output_tokens, so the small Bedrock-oriented limits
    # used by callers would truncate answers.
    config = types.GenerateContentConfig(
        temperature=temperature,
        safety_settings=[types.SafetySetting(**s) for s in safety_settings] if safety_settings else None,
    )
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=config,
    )
    text = response.text
    if not text:
        # Blocked by safety filters or truncated before any text was produced.
        reason = response.candidates[0].finish_reason if response.candidates else None
        raise RuntimeError(f"Gemini returned no text (finish_reason={reason})")
    return text


# ─── Unified interface ─────────────────────────────────────────────────
def generate(
    prompt: str,
    *,
    provider: str | None = None,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    safety_settings: list | None = None,
) -> str:
    """
    Provider-agnostic text generation.

    Parameters
    ----------
    prompt : str
        The user prompt.
    provider : str, optional
        "aws" or "gemini". Falls back to DEFAULT_LLM_PROVIDER env var.
    model : str, optional
        Override the default model for the chosen provider.
    temperature : float
    max_tokens : int
    safety_settings : list, optional
        Only used by Gemini.

    Returns
    -------
    str  –  The model's text response.
    """
    provider = provider or DEFAULT_PROVIDER

    if provider == "aws":
        return bedrock_generate(prompt, model_id=model, temperature=temperature, max_tokens=max_tokens)
    elif provider == "gemini":
        return gemini_generate(prompt, model_name=model, temperature=temperature, max_tokens=max_tokens, safety_settings=safety_settings)
    else:
        raise ValueError(f"Unknown LLM provider: {provider!r}. Use 'aws' or 'gemini'.")


# ─── Convenience: "fast" and "pro" tiers ───────────────────────────────
def generate_fast(prompt: str, **kwargs) -> str:
    """Use the fast/cheap model tier."""
    provider = kwargs.pop("provider", None) or DEFAULT_PROVIDER
    if provider == "aws":
        kwargs.setdefault("model", os.getenv("BEDROCK_MODEL_FAST") or os.getenv("BEDROCK_MODEL_ID") or "anthropic.claude-3-haiku-20240307-v1:0")
    else:
        kwargs.setdefault("model", os.getenv("GEMINI_MODEL_FAST", "gemini-2.5-flash"))
    return generate(prompt, provider=provider, **kwargs)


def generate_pro(prompt: str, **kwargs) -> str:
    """Use the high-quality model tier."""
    provider = kwargs.pop("provider", None) or DEFAULT_PROVIDER
    if provider == "aws":
        kwargs.setdefault("model", os.getenv("BEDROCK_MODEL_PRO") or os.getenv("BEDROCK_MODEL_ID") or "anthropic.claude-3-sonnet-20240229-v1:0")
    else:
        model = os.getenv("GEMINI_MODEL_PRO", "gemini-2.5-pro")
        if model == "gemini-3.8-flash":
            model = "gemini-2.5-pro"
        kwargs.setdefault("model", model)
    return generate(prompt, provider=provider, **kwargs)


# ─── JSON extraction helper ────────────────────────────────────────────
def safe_json(text: str):
    """Best-effort JSON extraction from LLM output."""
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        try:
            return json.loads(text[text.index("{"):text.rindex("}") + 1])
        except Exception:
            try:
                return json.loads(text[text.index("["):text.rindex("]") + 1])
            except Exception:
                return {}
