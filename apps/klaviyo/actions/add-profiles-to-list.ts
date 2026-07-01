import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient } from "../lib/client.ts";

interface Input {
  listId: string;
  profileIds: string[];
}

/**
 * Adds profiles to a list via the JSON:API relationships endpoint. The body
 * is `{ data: [{ type: "profile", id }, ...] }`. Returns 204 No Content.
 *
 * Note: this only adds list membership — it does NOT subscribe to marketing.
 * Use `subscribe-profiles` for that.
 */
const addProfilesToList: ActionDefinition<Input, void> = {
  key: "add-profiles-to-list",
  type: "perform",
  resource: "list",
  title: "Add Profiles to List",
  description: "Add existing profiles to a list by ID. Does not subscribe to marketing.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    {
      key: "profileIds",
      label: "Profile IDs",
      type: "string",
      repeat: true,
      required: true,
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    await client.request<void>(`/lists/${input.listId}/relationships/profiles/`, {
      method: "POST",
      body: {
        data: input.profileIds.map((id) => ({ type: "profile", id })),
      },
    });
  },
};

export default addProfilesToList;
