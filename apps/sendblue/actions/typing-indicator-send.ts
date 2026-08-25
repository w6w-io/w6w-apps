import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  number: string;
  state?: "start" | "stop";
  maxDurationMs?: number;
}

/**
 * `POST /api/send-typing-indicator` — iMessage 1:1 only; not supported in
 * group chats or on RCS/SMS (the animated three-dot indicator is an
 * iMessage-only Apple feature).
 */
const typingIndicatorSend: ActionDefinition<Input> = {
  key: "typing-indicator-send",
  type: "perform",
  resource: "typing-indicator",
  title: "Send Typing Indicator",
  description: "Show the animated typing indicator to a recipient. iMessage 1:1 only.",
  idempotent: true,
  params: [
    { key: "fromNumber", label: "From (Sendblue number)", type: "string", required: true },
    { key: "number", label: "To", type: "string", required: true },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [{ value: "start", label: "Start" }, { value: "stop", label: "Stop" }],
      default: "start",
    },
    {
      key: "maxDurationMs",
      label: "Max duration (ms)",
      type: "number",
      advanced: true,
      hint: "1–300000. Only applies to a start indicator.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "number", type: "string", label: "Number" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/send-typing-indicator",
      compact({
        from_number: input.fromNumber,
        number: input.number,
        state: input.state,
        max_duration_ms: input.maxDurationMs,
      }),
    );
  },
};

export default typingIndicatorSend;
