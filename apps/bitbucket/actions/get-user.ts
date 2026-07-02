import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient } from "../lib/client.ts";

const getUser: ActionDefinition<Record<string, never>> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Retrieve the profile of the account backing the current credential.",
  params: [],

  async execute(_input, ctx) {
    const client = new BitbucketClient(ctx);
    return client.request(`/user`);
  },
};

export default getUser;
