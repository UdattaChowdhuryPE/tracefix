#!/bin/bash

set -e

# Read input JSON from stdin
input=$(cat)
error_text=$(echo "$input" | jq -r '.error_text // empty')
stack_trace=$(echo "$input" | jq -r '.stack_trace // empty')
repo_url=$(echo "$input" | jq -r '.repo_url // empty')

# Classify the error type
category="ambiguous"
is_regression=false
confidence=50
suggested_approach=""
reason=""

# Heuristic 1: Check for null/undefined dereference at construction
if echo "$error_text" | grep -qE "Cannot read propert(y|ies)|TypeError.*undefined|ReferenceError"; then
  if echo "$stack_trace" | grep -qE "(new |\.initialize|constructor|__init__|\.new)"; then
    category="null_dereference_construction"
    is_regression=false
    confidence=85
    suggested_approach="Analyze the call site where the undefined config/object is passed. Suggest a defensive null-check or require explicit initialization."
    reason="Error occurs at object construction time (new Foo(...) or .initialize) with undefined/null dereference — not a regression from a commit change."
  fi
fi

# Heuristic 2: Check for configuration/setup errors (ENOENT, KeyError, missing env var)
if echo "$error_text" | grep -qE "ENOENT|no such file|KeyError|EnvironmentError|Missing.*config|undefined is not|not found"; then
  if ! echo "$stack_trace" | grep -qE "(bisect|checkout|git)" && [ "$category" = "ambiguous" ]; then
    category="configuration_error"
    is_regression=false
    confidence=80
    suggested_approach="Check required configuration, environment variables, and setup steps. Provide diagnostic output for missing files/config."
    reason="Error indicates missing or misconfigured setup (file not found, missing env var, missing config) — not a regression from code change."
  fi
fi

# Heuristic 3: Check for multi-frame stack with commit-bisectable depth
if [ "$category" = "ambiguous" ]; then
  frame_count=$(echo "$stack_trace" | grep -c "at " || true)
  construction_frames=$(echo "$stack_trace" | grep -cE "(new |constructor|__init__)" || true)

  # If we have >3 frames and most are not construction-related, it's likely a regression
  if [ "$frame_count" -gt 3 ] && [ "$construction_frames" -lt "$((frame_count / 2))" ]; then
    category="regression"
    is_regression=true
    confidence=75
    suggested_approach="Proceed with git bisect to find the commit that introduced this error."
    reason="Stack trace indicates a multi-frame error path in application code — compatible with regression bisection."
  fi
fi

# Output as JSON
jq -n \
  --arg is_regression "$is_regression" \
  --arg category "$category" \
  --argjson confidence "$confidence" \
  --arg suggested_approach "$suggested_approach" \
  --arg reason "$reason" \
  '{is_regression: ($is_regression == "true"), category: $category, confidence: $confidence, suggested_approach: $suggested_approach, reason: $reason}'
