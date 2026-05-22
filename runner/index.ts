import { query } from "gitclaw";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentDir = resolve(__dirname, "../agent");

const prompt = process.env.TRACEFIX_PROMPT ?? "";
const sessionId = process.env.TRACEFIX_SESSION_ID ?? "unknown";

if (!prompt) {
  process.stderr.write("TRACEFIX_PROMPT env var is required\n");
  process.exit(1);
}

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify({ ...obj, session_id: sessionId }) + "\n");
}

async function main(): Promise<void> {
  // Forward PROGRESS lines from stderr to stdout as step events
  process.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    for (const line of text.split("\n")) {
      if (line.startsWith("PROGRESS:")) {
        try {
          const payload = JSON.parse(line.slice("PROGRESS:".length)) as Record<string, unknown>;
          emit({ type: "step", ...payload });
        } catch {
          // ignore malformed PROGRESS lines
        }
      }
    }
  });

  for await (const msg of query({
    prompt,
    dir: agentDir,
    hooks: {
      preToolUse: async (ctx: Record<string, unknown>) => {
        emit({
          type: "tool_call",
          tool: (ctx["toolName"] as string) ?? "",
          args: ctx["args"] ?? {},
        });
        return { action: "allow" as const };
      },
    },
  })) {
    emit(msg as Record<string, unknown>);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
