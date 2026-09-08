import type { ActionDefinition } from "@w6w/types";
import { entityPath, JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * `PATCH /v1/People(id)` with `{"status": "Removed"}` — the collection's own "Archive member"
 * request. This removes the member from active headcount but keeps their history; use
 * `member-delete` to erase the record entirely.
 */
interface Input {
  personId: string;
}

const memberArchive: ActionDefinition<Input> = {
  key: "member-archive",
  type: "perform",
  resource: "member",
  title: "Archive Member",
  description: "Remove a member from active headcount without deleting their history.",
  idempotent: true,
  params: [{ key: "personId", label: "Person ID", type: "string", required: true }],
  output: [{ key: "ok", type: "boolean", label: "Archived" }],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    const status = await new JibbleClient(ctx).status(
      WORKSPACE_HOST,
      entityPath("People", input.personId),
      { method: "PATCH", body: { status: "Removed" } },
    );
    return { ok: status >= 200 && status < 300 };
  },
};

export default memberArchive;
