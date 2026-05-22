import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepTracker } from "./StepTracker";
import type { AgentEvent } from "../hooks/useAgentStream";

describe("StepTracker", () => {
  it("renders all 9 investigation steps", () => {
    render(<StepTracker events={[]} />);
    expect(screen.getByText("Memory Recall")).toBeTruthy();
    expect(screen.getByText("Dependency Chain")).toBeTruthy();
    expect(screen.getByText("Validate Root Cause")).toBeTruthy();
    expect(screen.getByText("Open PR")).toBeTruthy();
  });

  it("marks step as active on tool_call", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", tool: "validate_root_cause", args: {} },
    ];
    const { container } = render(<StepTracker events={events} />);
    const activeItem = container.querySelector(".bg-blue-50");
    expect(activeItem).toBeTruthy();
    expect(activeItem?.textContent).toContain("Validate Root Cause");
  });

  it("marks step as done on hypothesis event", () => {
    const events: AgentEvent[] = [
      { type: "hypothesis", validated: true, confidence: 90, evidence: "e", revised_hypothesis: null },
    ];
    const { container } = render(<StepTracker events={events} />);
    const doneItems = container.querySelectorAll(".bg-green-50");
    const labels = Array.from(doneItems).map((el) => el.textContent);
    expect(labels.some((l) => l?.includes("Validate Root Cause"))).toBe(true);
  });

  it("marks complete step done on complete event", () => {
    const events: AgentEvent[] = [{ type: "complete" }];
    const { container } = render(<StepTracker events={events} />);
    const doneItems = container.querySelectorAll(".bg-green-50");
    const labels = Array.from(doneItems).map((el) => el.textContent);
    expect(labels.some((l) => l?.includes("Open PR"))).toBe(true);
  });
});
