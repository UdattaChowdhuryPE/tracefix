import re

# Match GitHub personal access tokens (ghp_* and github_pat_*)
# ghp tokens: ghp_ prefix + 36 alphanumeric chars
# github_pat tokens: github_pat_ + ~85 alphanumeric/underscore chars
_TOKEN_RE = re.compile(r'ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{43,}')


def scrub(text: str) -> str:
    """Redact GitHub tokens from text, returning modified string."""
    if not isinstance(text, str):
        return text
    return _TOKEN_RE.sub("[REDACTED]", text)
