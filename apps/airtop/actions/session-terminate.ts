import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import { sessionIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/sessions/{id}` — end a session.
 *
 * Documented as idempotent by the vendor itself: "If a given session id does
 * not exist within the organization, it is ignored." No documented response
 * body on success, so this reports a synthesized `{success}`.
 */
interface Input {
  sessionId: string;
}

const sessionTerminate: ActionDefinition<Input> = {
  key: "session-terminate",
  type: "perform",
  resource: "session",
  title: "Terminate Session",
  description: "End a session. Already-ended or unknown session IDs are ignored, not an error.",
  idempotent: true,
  params: [sessionIdParam],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "sessionId", type: "string", label: "Session ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "terminating Airtop session", { sessionId: input.sessionId });
    await new AirtopClient(ctx).status(`/v1/sessions/${encodeURIComponent(input.sessionId)}`, {
      method: "DELETE",
    });
    return { success: true, sessionId: input.sessionId };
  },
};

export default sessionTerminate;
