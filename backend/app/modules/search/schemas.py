from typing import List, Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    document_id: str
    title: str
    case_id: str
    document_type: str
    classification: str
    excerpt: str
    score: float
    match_type: str  # keyword, semantic, hybrid


class SearchResponse(BaseModel):
    total: int
    query: str
    mode: str
    results: List[SearchResultItem]
