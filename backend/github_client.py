import os
import subprocess
import tempfile
from pathlib import Path
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

    base_ref = None
    try:
        base_ref = repo.get_branch(base_branch)
    except GithubException:
        try:
            base_branch = repo.default_branch
            base_ref = repo.get_branch(base_branch)
        except GithubException:
            try:
                base_branch = "master"
                base_ref = repo.get_branch(base_branch)
            except GithubException as e:
                return {"error": f"Could not resolve base branch: {e}"}

    clone_url = f"https://x-access-token:{token}@github.com/{repo_full_name}.git"

    with tempfile.TemporaryDirectory(prefix="tracefix-pr-") as tmpdir:
        repo_dir = Path(tmpdir) / "repo"
        try:
            subprocess.run(
                ["git", "clone", "--branch", base_branch, clone_url, str(repo_dir)],
                check=True,
                capture_output=True,
                text=True,
            )
            patch_path = repo_dir / "tracefix.patch"
            patch_path.write_text(patch, encoding="utf-8")
            subprocess.run(
                ["git", "-C", str(repo_dir), "apply", "--whitespace=nowarn", str(patch_path)],
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_dir), "checkout", "-b", branch_name],
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_dir), "config", "user.email", "tracefix@users.noreply.github.com"],
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_dir), "config", "user.name", "TraceFix"],
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                ["git", "-C", str(repo_dir), "add", "-A"],
                check=True,
                capture_output=True,
                text=True,
            )
            commit_result = subprocess.run(
                ["git", "-C", str(repo_dir), "commit", "-m", title],
                check=True,
                capture_output=True,
                text=True,
            )
            push_result = subprocess.run(
                ["git", "-C", str(repo_dir), "push", "origin", branch_name],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.strip() if e.stderr else ""
            stdout = e.stdout.strip() if e.stdout else ""
            detail = stderr or stdout or str(e)
            return {"error": f"Could not apply or push patch: {detail}"}
        except Exception as e:
            return {"error": f"Could not prepare PR: {e}"}

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
