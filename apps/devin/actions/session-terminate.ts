import type { ActionDefinition } from "@w6w/types";
import { DevinClient, type DevinSession } from "../lib/client.ts";
import { devinIdParam } from "../lib/params.ts";

/**
 * `DELETE /v3/organizations/{org_id}/sessions/{devin_id}` — terminate a
 * session's VM. Once terminated a session cannot be resumed, so `archive`
 * (below) is offered to preserve it for future reference instead of losing
 * it outright.
 *
 * `idempotent: true`: the end state after one call and after five is the same
 * session terminated. A repeat call on an already-terminated session may
 * surface the documented `409`/`404` rather than silently succeeding again —
 * worth seeing, since it usually just confirms the first call already landed.
 */
interface Input {
  devinId: string;
  archive?: boolean;
}

const sessionTerminate: ActionDefinition<Input, DevinSession> = {
  key: "session-terminate",
  type: "perform",
  resource: "session",
  title: "Terminate Session",
  description: "Terminate a session's VM. Cannot be undone unless Archive is checked.",
  idempotent: true,
  params: [
    devinIdParam,
    {
      key: "archive",
      label: "Archive instead of discarding",
      type: "boolean",
      hint: "Preserve the session for future reference rather than discarding it outright.",
    },
  ],
  output: [
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "is_archived", type: "boolean", label: "Whether the session is archived" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<DevinSession>(
      `/sessions/${encodeURIComponent(input.devinId)}`,
      { method: "DELETE", query: { archive: input.archive } },
    );
  },
};

export default sessionTerminate;
