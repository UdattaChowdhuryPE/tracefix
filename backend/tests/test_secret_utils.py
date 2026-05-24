import pytest
from secret_utils import scrub


class TestScrub:
    def test_scrub_ghp_token(self):
        text = "Here is my token ghp_123456789012345678901234567890123456"
        result = scrub(text)
        assert "[REDACTED]" in result
        assert "ghp_" not in result

    def test_scrub_github_pat_token(self):
        text = "Here is my token github_pat_11111111111111111111111111111111111111111111111111111111111111111111111111111111111"
        result = scrub(text)
        assert "[REDACTED]" in result
        assert "github_pat_" not in result

    def test_scrub_multiple_tokens(self):
        # GitHub personal access tokens: ghp_ + 36 alphanumeric chars
        # github_pat tokens: github_pat_ + 85+ chars
        text = "Token 1: ghp_123456789012345678901234567890123456 Token 2: github_pat_11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"
        result = scrub(text)
        assert result.count("[REDACTED]") == 2
        assert "ghp_" not in result
        assert "github_pat_" not in result

    def test_scrub_no_token(self):
        text = "This is a normal string with no tokens"
        result = scrub(text)
        assert result == text

    def test_scrub_non_string(self):
        result = scrub(123)
        assert result == 123

    def test_scrub_token_in_url(self):
        # ghp_ tokens: ghp_ prefix + 36 alphanumeric chars
        text = "https://github.com/token?key=ghp_123456789012345678901234567890123456"
        result = scrub(text)
        assert "[REDACTED]" in result
        assert "ghp_" not in result
