"""Pure trait evaluators for investigation quality scoring."""

import json
from typing import Any


def find_first(events: list[dict], event_type: str, field: str | None = None) -> Any:
    """Return field value from first matching event, or None."""
    for e in events:
        if e.get("type") == event_type:
            return e.get(field) if field else e
    return None


TRAIT_EVALUATORS = {
    "correct_regression_flag": lambda evts, gt: find_first(evts, "triage_result", "is_regression") == gt["is_regression"],
    "correct_triage_category": lambda evts, gt: find_first(evts, "triage_result", "category") == gt.get("category"),
    "memory_recalled": lambda evts, gt: bool(find_first(evts, "memory_match", "matches")),
    "hypothesis_validated": lambda evts, gt: find_first(evts, "hypothesis", "validated") is True,
    "confidence_above_threshold": lambda evts, gt: (find_first(evts, "hypothesis", "confidence") or 0) >= gt.get("confidence_min", 70),
    "correct_file_identified": lambda evts, gt: gt.get("root_cause_file") in (find_first(evts, "patch_ready", "files_modified") or []),
    "patch_minimality": lambda evts, gt: (
        (find_first(evts, "patch_ready", "lines_changed") or 9999) <= 20
        and len(find_first(evts, "patch_ready", "files_modified") or []) <= 5
    ),
    "reached_complete": lambda evts, gt: any(e.get("type") == "complete" for e in evts),
}


def score_scenario(scenario: dict[str, Any], events: list[dict]) -> dict[str, Any]:
    """Score an investigation scenario against ground truth.
    
    Returns:
        {"total_score": 0-100, "traits": [{"trait": ..., "weight": ..., "passed": bool, "score": ...}]}
    """
    gt = scenario["ground_truth"]
    rubric = scenario["rubric"]
    total_weight = sum(r["weight"] for r in rubric)
    traits = []
    earned = 0

    for r in rubric:
        trait_name = r["trait"]
        evaluator = TRAIT_EVALUATORS.get(trait_name)
        if not evaluator:
            raise ValueError(f"Unknown trait: {trait_name}")

        passed = evaluator(events, gt)
        score = r["weight"] if passed else 0
        earned += score
        traits.append({
            "trait": trait_name,
            "weight": r["weight"],
            "passed": passed,
            "score": score,
        })

    return {
        "total_score": round(earned / total_weight * 100) if total_weight > 0 else 0,
        "traits": traits,
    }
