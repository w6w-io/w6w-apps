import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  url: string;
  description?: string;
  active?: boolean;
  events: string[];
  secret?: string;
}

const createWorkspaceHook: ActionDefinition<Input> = {
  key: "create-workspace-hook",
  type: "perform",
  resource: "hook",
  title: "Create Workspace Webhook",
  description: "Install a webhook on a workspace subscribed to the given events.",
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    { key: "url", label: "Callback URL", type: "string", required: true },
    { key: "description", label: "Description", type: "string", default: "w6w webhook" },
    { key: "active", label: "Active", type: "boolean", default: true },
    {
      key: "events",
      label: "Events",
      type: "string",
      required: true,
      hint: "Array of Bitbucket event names, e.g. `[\"repo:push\"]`. Use list-workspace-events to enumerate.",
    },
    { key: "secret", label: "Secret", type: "secret" },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    const body: Record<string, unknown> = {
      description: input.description ?? "w6w webhook",
      url: input.url,
      active: input.active ?? true,
      events: input.events,
    };
    if (input.secret) body.secret = input.secret;
    return client.request(`/workspaces/${input.workspace}/hooks`, {
      method: "POST",
      body,
    });
  },
};

export default createWorkspaceHook;
