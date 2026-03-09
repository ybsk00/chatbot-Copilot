import logging
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)
_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.error(
                f"Supabase credentials missing: URL={'set' if SUPABASE_URL else 'MISSING'}, "
                f"KEY={'set' if SUPABASE_KEY else 'MISSING'}"
            )
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client
