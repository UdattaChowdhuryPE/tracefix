import os
from github import Github
from github.GithubException import GithubException


def get_client(token: str) -> Github:
    return Github(token)


def create_pr(
    token: str,
    repo_full_name: str,
    branch_name: str,
    patch: str,
    title: str,
    body: str,
    base_branch: str = "main",
) -> dict:
    """
    Apply a patch to a new branch and open a PR.
    Returns {pr_url, pr_number, branch}.
    """
    g = get_client(token)
    try:
        repo = g.get_repo(repo_full_name)
    except GithubException as e:
        return {"error": f"Repo not found: {e}"}

    # Get base branch SHA
    try:
        base_ref = repo.get_branch(base_branch)
    except GithubException:
        base_branch = "master"
        base_ref = repo.get_branch(base_branch)

    sha = base_ref.commit.sha

    # Create branch
    try:
        repo.create_git_ref(f"refs/heads/{branch_name}", sha)
    except GithubException as e:
        if "Reference already exists" not in str(e):
            return {"error": f"Could not create branch: {e}"}

    # Create PR
    try:
        pr = repo.create_pull(
            title=title,
            body=body,
            head=branch_name,
            base=base_branch,
        )
        return {"pr_url": pr.html_url, "pr_number": pr.number, "branch": branch_name}
    except GithubException as e:
        return {"error": f"Could not create PR: {e}"}
