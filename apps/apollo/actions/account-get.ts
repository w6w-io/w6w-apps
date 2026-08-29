import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `GET /accounts/{id}` — one account already saved in your Apollo instance. */
interface Input {
  id: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch one account already saved in your Apollo instance, by its Apollo ID.",
  params: [{ key: "id", label: "Account", type: "string", required: true }],
  output: [{ key: "account", type: "object", label: "The account" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ account?: unknown }>(
      `/accounts/${encodeId(input.id)}`,
    );
    return { account: body.account ?? null };
  },
};

export default accountGet;
