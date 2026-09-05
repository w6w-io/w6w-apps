import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  deleteContacts?: "on" | "off";
}

interface Output {
  message?: string;
}

/**
 * `GET /deletemailinglist` — verified against
 * `https://www.zoho.com/campaigns/help/developers/delete-list.html`.
 * `deleteContacts: "on"` removes the list's contacts from the whole account,
 * not just the list; `"off"` (the default) only removes the list itself.
 */
const listDelete: ActionDefinition<Input, Output> = {
  key: "list-delete",
  type: "perform",
  resource: "list",
  title: "Delete Mailing List",
  description:
    'Delete a mailing list. Set "Delete contacts" to remove its contacts from the whole account ' +
    "rather than just the list.",
  idempotent: true,
  params: [
    listKey,
    {
      key: "deleteContacts",
      label: "Delete contacts too",
      type: "select",
      options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }],
      default: "off",
    },
  ],
  output: [{ key: "message", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ message?: string }>(
      "deletemailinglist",
      { query: { listkey: input.listKey, deletecontacts: input.deleteContacts } },
    );
    return { message: body.message };
  },
};

export default listDelete;
