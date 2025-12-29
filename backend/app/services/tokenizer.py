"""Tokenizer service for Chinese text segmentation using jieba."""

import logging

import jieba

logger = logging.getLogger(__name__)

# Flag to track if jieba is initialized
_jieba_initialized = False


def initialize_jieba() -> None:
    """
    Initialize jieba dictionary.
    
    Call this at application startup to preload the dictionary
    and avoid cold start latency on first tokenization.
    """
    global _jieba_initialized
    if not _jieba_initialized:
        logger.info("Initializing jieba dictionary...")
        jieba.initialize()
        _jieba_initialized = True
        logger.info("Jieba dictionary initialized")


def tokenize_for_search(text: str | None) -> str:
    """
    Tokenize text for full-text search using jieba.
    
    Uses jieba's search engine mode which performs fine-grained
    segmentation suitable for search applications.
    
    Args:
        text: The text to tokenize. Can be None or empty.
        
    Returns:
        Space-separated tokens suitable for FTS5 indexing.
        Returns empty string if input is None or empty.
    """
    if not text:
        return ""
    
    # Use search engine mode for better recall
    # This mode cuts long words into shorter segments
    tokens = jieba.cut_for_search(text)
    return " ".join(tokens)

