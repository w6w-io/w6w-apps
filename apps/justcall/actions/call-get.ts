import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/** `GET /v2.1/calls/{id}` — verified against `call_get_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  id: string | number;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description:
    "Fetch data for a call: duration, direction, status, timestamps, notes and disposition.",
  params: [
    { key: "id", label: "Call ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Call ID" },
    { key: "call_sid", type: "string", label: "Unique call SID" },
    { key: "agent_id", type: "number", label: "Agent ID" },
    { key: "agent_name", type: "string", label: "Agent name" },
    { key: "contact_number", type: "string", label: "Contact phone number" },
    { key: "justcall_number", type: "string", label: "JustCall number used" },
    { key: "call_date", type: "string", label: "Call date (UTC)" },
    { key: "call_time", type: "string", label: "Call time (UTC)" },
    { key: "call_duration", type: "object", label: "Duration breakdown" },
    { key: "call_info", type: "object", label: "Direction, type, notes, disposition, recording" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/calls/${encodeURIComponent(String(input.id))}`);
  },
};

export default callGet;
