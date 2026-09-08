import type { ActionDefinition } from "@w6w/types";
import { entityPath, JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * `DELETE /v1/People(id)` — permanently erase a member ("Delete member completely" in the
 * collection). Unlike `member-archive`, there is no history left behind afterwards.
 */
interface Input {
  personId: string;
}

const memberDelete: ActionDefinition<Input> = {
  key: "member-delete",
  type: "perform",
  resource: "member",
  title: "Delete Member",
  description: "Permanently delete a member and their history. This cannot be undone.",
  idempotent: true,
  params: [{ key: "personId", label: "Person ID", type: "string", required: true }],
  output: [{ key: "ok", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    const status = await new JibbleClient(ctx).status(
      WORKSPACE_HOST,
      entityPath("People", input.personId),
      { method: "DELETE" },
    );
    return { ok: status >= 200 && status < 300 };
  },
};

export default memberDelete;
