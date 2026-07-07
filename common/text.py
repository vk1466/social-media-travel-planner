import re

HASHTAG_PATTERN = re.compile(r"#(\w+)")


def extract_hashtags(caption: str) -> tuple[str, ...]:
  return tuple(match.group(1).lower() for match in HASHTAG_PATTERN.finditer(caption))


def normalize_caption(caption: str) -> str:
  return " ".join(caption.split())
