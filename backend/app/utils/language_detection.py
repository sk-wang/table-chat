"""Language detection utility for detecting Chinese vs English input."""

import re


def is_chinese_text(text: str) -> bool:
    """
    Check if the text contains Chinese characters.

    Args:
        text: Input text to check

    Returns:
        True if the text contains Chinese characters, False otherwise
    """
    # Match CJK Unified Ideographs range (most common Chinese characters)
    chinese_pattern = re.compile(r"[\u4e00-\u9fff]")
    return bool(chinese_pattern.search(text))


def detect_language(text: str) -> str:
    """
    Detect the language of the input text.

    Uses a simple heuristic:
    - If text contains any Chinese characters, return "zh"
    - Otherwise, return "en"

    Args:
        text: Input text to analyze

    Returns:
        "zh" for Chinese, "en" for English (or other non-Chinese languages)
    """
    if is_chinese_text(text):
        return "zh"
    return "en"
