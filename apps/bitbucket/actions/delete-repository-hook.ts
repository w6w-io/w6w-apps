import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  repoSlug: string;
  uid: string;
}

const deleteRepositoryHook: ActionDefinition<Input> = {
  key: "delete-repository-hook",
  type: "perform",
  resource: "hook",
  title: "Delete Repository Webhook",
  description: "Uninstall a repository webhook by UID.",
  idempotent: true,
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    { key: "repoSlug", label: "Repository slug", type: "string", required: true },
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
    await client.request(
      `/repositories/${input.workspace}/${input.repoSlug}/hooks/${input.uid}`,
      { method: "DELETE" },
    );
    return { deleted: true, uid: input.uid };
  },
};

export default deleteRepositoryHook;
