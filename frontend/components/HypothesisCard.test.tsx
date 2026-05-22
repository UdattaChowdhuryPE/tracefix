import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HypothesisCard } from "./HypothesisCard";

const baseEvent = {
  type: "hypothesis" as const,
  validated: true,
  confidence: 85,
  evidence: "Commit abc123 introduced null dereference",
  revised_hypothesis: null,
};

describe("HypothesisCard", () => {
  it("renders validated root cause label", () => {
    render(<HypothesisCard event={baseEvent} />);
    expect(screen.getByText(/Root Cause Validated/)).toBeTruthy();
  });

  it("renders confidence badge", () => {
    render(<HypothesisCard event={baseEvent} />);
    expect(screen.getByText("85% confidence")).toBeTruthy();
  });

  it("renders evidence text", () => {
    render(<HypothesisCard event={baseEvent} />);
    expect(screen.getByText("Commit abc123 introduced null dereference")).toBeTruthy();
  });

  it("shows inconclusive label when not validated", () => {
    render(<HypothesisCard event={{ ...baseEvent, validated: false, confidence: 40 }} />);
    expect(screen.getByText(/Validation Inconclusive/)).toBeTruthy();
  });

  it("shows revised hypothesis when present", () => {
    render(<HypothesisCard event={{ ...baseEvent, revised_hypothesis: "Actually it was Y" }} />);
    expect(screen.getByText(/Actually it was Y/)).toBeTruthy();
  });

  it("does not render revised section when null", () => {
    render(<HypothesisCard event={baseEvent} />);
    expect(screen.queryByText(/Revised:/)).toBeNull();
  });
});
