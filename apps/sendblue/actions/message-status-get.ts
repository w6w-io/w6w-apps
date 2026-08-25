import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  handle: string;
}

/**
 * `GET /api/status` — a bare, unversioned path, distinct from `GET
 * /api/v2/messages/{id}`. Both return a message, but this one takes the
 * handle as a `handle` query parameter rather than a path segment, and its
 * response is the bare `MessageResponse` object (no `{"data": ...}` envelope)
 * — verified against `api/resources/messages/methods/get_status`, 2026-08-25.
 */
const messageStatusGet: ActionDefinition<Input> = {
  key: "message-status-get",
  type: "read",
  resource: "message",
  title: "Get Message Status",
  description: "Retrieve the current status of a message by its handle (avoids duplicate sends).",
  params: [
    { key: "handle", label: "Message handle", type: "string", required: true },
  ],
  output: [
    { key: "message_handle", type: "string", label: "Message handle" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/status", { handle: input.handle });
  },
};

export default messageStatusGet;
