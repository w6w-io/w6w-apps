import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  repoSlug: string;
}

const getRepository: ActionDefinition<Input> = {
  key: "get-repository",
  type: "read",
  resource: "repository",
  title: "Get Repository",
  description: "Retrieve a single repository by workspace + slug.",
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    { key: "repoSlug", label: "Repository slug", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    return client.request(`/repositories/${input.workspace}/${input.repoSlug}`);
  },
};

export default getRepository;
