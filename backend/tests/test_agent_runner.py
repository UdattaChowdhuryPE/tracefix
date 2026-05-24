import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent_runner import repo_full_name_from_url


def test_repo_full_name_from_url_strips_git_suffix():
    assert repo_full_name_from_url("https://github.com/acme/tracefix.git") == "acme/tracefix"


def test_repo_full_name_from_url_handles_plain_https_url():
    assert repo_full_name_from_url("https://github.com/acme/tracefix") == "acme/tracefix"
