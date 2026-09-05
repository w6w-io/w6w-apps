import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";

interface Input {
  repoId: string;
}

/** `DELETE /settings/repo-blocklists/repos/:id` — returns `204 No Content`. */
const repoBlocklistDelete: ActionDefinition<Input> = {
  key: "repo-blocklist-delete",
  type: "perform",
  resource: "repo-blocklist",
  title: "Delete Repo Blocklist",
  description: "Remove a specific repository from the blocklist.",
  idempotent: true,
  params: [
    {
      key: "repoId",
      label: "Repo blocklist ID",
      type: "string",
      required: true,
      hint: "ID of the repository blocklist entry to delete (from Get Team Repo Blocklists).",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new CursorClient(ctx).delete(
      `/settings/repo-blocklists/repos/${encodeId(input.repoId)}`,
    );
    return { deleted: true };
  },
};

export default repoBlocklistDelete;
