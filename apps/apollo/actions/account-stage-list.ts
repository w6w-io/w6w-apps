import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/** `GET /account_stages` — every account stage configured for your team. */
const accountStageList: ActionDefinition<Record<string, never>> = {
  key: "account-stage-list",
  type: "read",
  resource: "account",
  title: "List Account Stages",
  description: "List every account stage configured for your team, for use with account-create/" +
    "update and account-search.",
  params: [],
  output: [{ key: "account_stages", type: "array", label: "Account stages" }],

  async execute(_input, ctx) {
    const body = await new ApolloClient(ctx).get<{ account_stages?: unknown[] }>("/account_stages");
    return { account_stages: body.account_stages ?? [] };
  },
};

export default accountStageList;
