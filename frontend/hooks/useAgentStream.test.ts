import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgentStream } from "./useAgentStream";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {}
  close() { this.closed = true; }

  emit(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAgentStream", () => {
  it("starts with empty state", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    expect(result.current.events).toEqual([]);
    expect(result.current.escalation).toBeNull();
    expect(result.current.isComplete).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("appends events on message", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    act(() => ws.emit({ type: "thinking", text: "reasoning" }));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toEqual({ type: "thinking", text: "reasoning" });
  });

  it("ignores ping events", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    act(() => ws.emit({ type: "ping" }));
    expect(result.current.events).toHaveLength(0);
  });

  it("sets escalation on escalation event", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    const escalationEvent = { type: "escalation", reason: "low confidence", confidence: 45, hypothesis: "maybe X" };
    act(() => ws.emit(escalationEvent));
    expect(result.current.escalation).toEqual(escalationEvent);
  });

  it("clears escalation on escalation_resolved", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    act(() => ws.emit({ type: "escalation", reason: "x", confidence: 40, hypothesis: "" }));
    act(() => ws.emit({ type: "escalation_resolved", decision: "approve", guidance: "" }));
    expect(result.current.escalation).toBeNull();
  });

  it("sets isComplete on complete event", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    act(() => ws.emit({ type: "complete" }));
    expect(result.current.isComplete).toBe(true);
  });

  it("sets error on error event", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    act(() => ws.emit({ type: "error", message: "agent crashed" }));
    expect(result.current.error).toBe("agent crashed");
  });

  it("sets error on WebSocket onerror", () => {
    const { result } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    act(() => ws.onerror?.());
    expect(result.current.error).toBe("WebSocket connection failed");
  });

  it("closes WebSocket on unmount", () => {
    const { result, unmount } = renderHook(() => useAgentStream("sess-1"));
    const ws = MockWebSocket.instances[0];
    unmount();
    expect(ws.closed).toBe(true);
  });
});
