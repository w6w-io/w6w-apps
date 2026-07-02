import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  repoSlug: string;
  url: string;
  description?: string;
  active?: boolean;
  events: string[];
  secret?: string;
}

const createRepositoryHook: ActionDefinition<Input> = {
  key: "create-repository-hook",
  type: "perform",
  resource: "hook",
  title: "Create Repository Webhook",
  description: "Install a webhook on a repository subscribed to the given events.",
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    { key: "repoSlug", label: "Repository slug", type: "string", required: true },
    { key: "url", label: "Callback URL", type: "string", required: true },
    { key: "description", label: "Description", type: "string", default: "w6w webhook" },
    { key: "active", label: "Active", type: "boolean", default: true },
    {
      key: "events",
      label: "Events",
      type: "string",
      required: true,
      hint: "Array of Bitbucket event names, e.g. `[\"repo:push\"]`. Use list-repository-events to enumerate.",
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
    return client.request(
      `/repositories/${input.workspace}/${input.repoSlug}/hooks`,
      { method: "POST", body },
    );
  },
};

export default createRepositoryHook;
