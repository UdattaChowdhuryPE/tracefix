"""Pytest configuration and shared fixtures for evals."""

import json
import pytest
from pathlib import Path


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "unit: Layer 1 tool script unit tests")
    config.addinivalue_line("markers", "integration: Layer 2 event stream structural tests")
    config.addinivalue_line("markers", "quality: Layer 3 scenario quality scoring tests")


@pytest.fixture
def demo_events():
    """Load demo JSONL events for testing."""
    fixture_path = Path(__file__).parent / "fixtures" / "demo_events.jsonl"
    events = []
    with open(fixture_path) as f:
        for line in f:
            if line.strip():
                events.append(json.loads(line))
    return events


@pytest.fixture
def yaml_loader_scenario():
    """Load yaml_loader_missing scenario."""
    scenario_path = Path(__file__).parent / "scenarios" / "yaml_loader_missing.json"
    with open(scenario_path) as f:
        return json.load(f)
