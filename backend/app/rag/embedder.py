from google import genai
from google.genai import types
from app.config import GOOGLE_API_KEY, MODELS, EMBEDDING_DIM

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


def embed_document(text: str) -> list[float]:
    """문서 청크 임베딩 (저장용)"""
    result = _get_client().models.embed_content(
        model=MODELS["embedding"],
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    return result.embeddings[0].values


def embed_query(text: str) -> list[float]:
    """검색 쿼리 임베딩"""
    result = _get_client().models.embed_content(
        model=MODELS["embedding"],
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    return result.embeddings[0].values
