import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockEvents = [
  { type: "delta", deltaType: "thinking", content: "analyzing..." },
  { type: "tool_call", tool: "validate_root_cause", args: { hypothesis: "null deref" } },
  { type: "system", subtype: "session_end", content: "done" },
];

vi.mock("gitclaw", () => ({
  query: vi.fn(async function* () {
    for (const event of mockEvents) yield event;
  }),
}));

describe("runner NDJSON output", () => {
  let lines: string[];
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    lines = [];
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      if (typeof chunk === "string") lines.push(...chunk.split("\n").filter(Boolean));
      return true;
    });
    process.env.TRACEFIX_PROMPT = "TypeError in auth.py";
    process.env.TRACEFIX_SESSION_ID = "test-session";
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("emits NDJSON lines with session_id attached", async () => {
    const { main } = await import("./index.js");
    await main();

    expect(lines.length).toBeGreaterThanOrEqual(mockEvents.length);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty("session_id", "test-session");
    }
  });

  it("emits tool_call type for tool_call events", async () => {
    const { main } = await import("./index.js");
    await main();

    const toolCallLines = lines
      .map((l) => JSON.parse(l))
      .filter((e) => e.type === "tool_call");
    expect(toolCallLines.length).toBeGreaterThan(0);
    expect(toolCallLines[0]).toMatchObject({ tool: "validate_root_cause" });
  });
});
