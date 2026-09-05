import type { ActionDefinition } from "@w6w/types";
import { DevinClient, type DevinSession } from "../lib/client.ts";
import { devinIdParam } from "../lib/params.ts";

/**
 * `POST /v3/organizations/{org_id}/sessions/{devin_id}/archive` — put a
 * running session to sleep and preserve it for future reference.
 *
 * An archived session can still be viewed but not modified or resumed —
 * unlike `session-terminate`, this is meant to be reversible in spirit (the
 * transcript and pull requests stay put), just not resumable as a live agent.
 *
 * `idempotent: true` in the sense the runtime cares about: the end state
 * after one call and after five is the same session archived. A repeat call
 * may surface the documented `409` rather than silently succeeding again —
 * worth seeing, since it usually just confirms the first call already landed.
 */
interface Input {
  devinId: string;
}

const sessionArchive: ActionDefinition<Input, DevinSession> = {
  key: "session-archive",
  type: "perform",
  resource: "session",
  title: "Archive Session",
  description: "Archive a session, putting it to sleep if currently running.",
  idempotent: true,
  params: [devinIdParam],
  output: [
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "is_archived", type: "boolean", label: "Whether the session is archived" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<DevinSession>(
      `/sessions/${encodeURIComponent(input.devinId)}/archive`,
      { method: "POST" },
    );
  },
};

export default sessionArchive;
