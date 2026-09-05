import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `GET /api/v2/lists/{id}` — one list's details. */
interface Input {
  id: number;
}

const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Fetch one contact list's details.",
  params: [{ key: "id", label: "List ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "name", type: "string", label: "List name" },
    { key: "membersCount", type: "number", label: "Number of contacts in the list" },
    { key: "shared", type: "boolean", label: "Shared among sub-accounts" },
    { key: "isDefault", type: "boolean", label: "Is the account's default list" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/lists/${encodeURIComponent(input.id)}`);
  },
};

export default listGet;
