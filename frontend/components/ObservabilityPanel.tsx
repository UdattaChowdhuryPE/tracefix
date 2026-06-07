"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface SessionMetrics {
  session_id: string;
  total_events: number;
  by_type: Record<string, number>;
  tool_durations: Record<string, { count: number; avg_ms: number; max_ms: number }>;
  span_seconds: number;
}

interface ObservabilityPanelProps {
  sessionId: string;
  parseErrorCount?: number;
  reconnectCount?: number;
}

export function ObservabilityPanel({
  sessionId,
  parseErrorCount = 0,
  reconnectCount = 0,
}: ObservabilityPanelProps) {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
        const response = await fetch(`${backendUrl}/api/sessions/${sessionId}/metrics`);
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (e) {
        console.error("Failed to fetch metrics:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  if (!metrics) return null;

  const sortedTools = Object.entries(metrics.tool_durations).sort(
    ([, a], [, b]) => b.avg_ms - a.avg_ms
  );

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Observability</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {metrics.total_events} events
          </span>
          {parseErrorCount > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              {parseErrorCount} parse errors
            </span>
          )}
          {reconnectCount > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
              {reconnectCount} reconnects
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-4 space-y-4 bg-white">
          {/* Session Duration */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Session Duration</h3>
            <p className="text-lg text-blue-600 font-mono">
              {metrics.span_seconds.toFixed(2)}s
            </p>
          </div>

          {/* Event Type Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Event Types</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(metrics.by_type)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">{type}</span>
                        <span className="text-gray-900 font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded"
                          style={{
                            width: `${(count / metrics.total_events) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Tool Performance */}
          {sortedTools.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tool Performance</h3>
              <div className="space-y-2 text-sm">
                {sortedTools.slice(0, 5).map(([tool, data]) => (
                  <div key={tool}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600 truncate">{tool}</span>
                      <span className="text-gray-900 font-mono font-medium">
                        {data.avg_ms.toFixed(0)}ms avg
                      </span>
                    </div>
                    <div className="flex gap-1 text-xs text-gray-500">
                      <span>{data.count}x</span>
                      <span>max: {data.max_ms.toFixed(0)}ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-1.5 mt-1">
                      <div
                        className="bg-green-500 h-1.5 rounded"
                        style={{
                          width: `${Math.min(100, (data.avg_ms / 5000) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Stats */}
          <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            {parseErrorCount > 0 && <p>Parse errors: {parseErrorCount}</p>}
            {reconnectCount > 0 && <p>Reconnects: {reconnectCount}</p>}
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
