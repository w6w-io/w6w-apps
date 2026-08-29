import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";

/**
 * `GET /api/v2/workspaces/current` — the workspace the API key belongs to.
 * Takes no parameters; the workspace is derived entirely from the key.
 * Requires `workspaces:read` (or `all:read`/`all:all`) specifically — a key
 * scoped only to Campaigns/Leads/Accounts will be refused here even though
 * it works fine for this app's other actions.
 */
type Input = Record<string, never>;

const workspaceGet: ActionDefinition<Input> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Read the current workspace's details. Requires the workspaces:read scope " +
    "specifically.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(_input, ctx) {
    return new InstantlyClient(ctx).json("/workspaces/current");
  },
};

export default workspaceGet;
