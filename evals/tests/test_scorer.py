"""Unit tests for the scorer module."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scorer import score_scenario


def test_perfect_score_on_demo_events(demo_events, yaml_loader_scenario):
    """Demo JSONL should score 100/100 on yaml_loader_missing scenario."""
    result = score_scenario(yaml_loader_scenario, demo_events)
    assert result["total_score"] == 100
    for trait in result["traits"]:
        assert trait["passed"] is True


def test_missing_complete_event_lowers_score(demo_events, yaml_loader_scenario):
    """Removing complete event should drop the reached_complete trait."""
    events = [e for e in demo_events if e["type"] != "complete"]
    result = score_scenario(yaml_loader_scenario, events)
    # reached_complete has weight 10 out of 100, so score drops
    assert result["total_score"] == 90
    complete_trait = next(t for t in result["traits"] if t["trait"] == "reached_complete")
    assert complete_trait["passed"] is False


def test_wrong_is_regression_fails_trait(demo_events, yaml_loader_scenario):
    """Flipping is_regression should fail the correct_regression_flag trait."""
    events = demo_events.copy()
    for e in events:
        if e["type"] == "triage_result":
            e["is_regression"] = True
            break
    result = score_scenario(yaml_loader_scenario, events)
    regression_trait = next(t for t in result["traits"] if t["trait"] == "correct_regression_flag")
    assert regression_trait["passed"] is False


def test_low_confidence_fails_threshold_trait(demo_events, yaml_loader_scenario):
    """Setting confidence < 70 should fail the confidence_above_threshold trait."""
    events = demo_events.copy()
    for e in events:
        if e["type"] == "hypothesis":
            e["confidence"] = 65
            break
    result = score_scenario(yaml_loader_scenario, events)
    conf_trait = next(t for t in result["traits"] if t["trait"] == "confidence_above_threshold")
    assert conf_trait["passed"] is False


def test_missing_memory_match_fails_memory_recalled(demo_events, yaml_loader_scenario):
    """Removing memory_match event should fail the memory_recalled trait."""
    events = [e for e in demo_events if e["type"] != "memory_match"]
    result = score_scenario(yaml_loader_scenario, events)
    memory_trait = next(t for t in result["traits"] if t["trait"] == "memory_recalled")
    assert memory_trait["passed"] is False


def test_all_traits_evaluated(yaml_loader_scenario):
    """Score should evaluate all traits in the rubric."""
    minimal_events = [{"type": "complete"}]
    result = score_scenario(yaml_loader_scenario, minimal_events)
    assert len(result["traits"]) == len(yaml_loader_scenario["rubric"])
    for trait in result["traits"]:
        assert "trait" in trait
        assert "weight" in trait
        assert "passed" in trait
        assert "score" in trait
