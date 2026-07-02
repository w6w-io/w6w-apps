import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  uid: string;
}

const deleteWorkspaceHook: ActionDefinition<Input> = {
  key: "delete-workspace-hook",
  type: "perform",
  resource: "hook",
  title: "Delete Workspace Webhook",
  description: "Uninstall a workspace webhook by UID.",
  idempotent: true,
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    {
      key: "uid",
      label: "Webhook UID",
      type: "string",
      required: true,
      hint: "The `uuid` from the hook, curly braces stripped.",
    },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    await client.request(`/workspaces/${input.workspace}/hooks/${input.uid}`, {
      method: "DELETE",
    });
    return { deleted: true, uid: input.uid };
  },
};

export default deleteWorkspaceHook;
