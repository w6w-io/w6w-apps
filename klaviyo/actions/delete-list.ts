import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient } from "../lib/client.ts";

interface Input {
  listId: string;
}

const deleteList: ActionDefinition<Input, void> = {
  key: "delete-list",
  type: "perform",
  resource: "list",
  title: "Delete List",
  description: "Delete a Klaviyo list. Profiles are not deleted, only their list membership.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    await client.request<void>(`/lists/${input.listId}/`, { method: "DELETE" });
  },
};

export default deleteList;
