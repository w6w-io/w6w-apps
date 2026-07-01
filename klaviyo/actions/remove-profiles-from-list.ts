import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient } from "../lib/client.ts";

interface Input {
  listId: string;
  profileIds: string[];
}

const removeProfilesFromList: ActionDefinition<Input, void> = {
  key: "remove-profiles-from-list",
  type: "perform",
  resource: "list",
  title: "Remove Profiles from List",
  description: "Remove profiles from a list by ID. Profiles themselves are not deleted.",
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
      method: "DELETE",
      body: {
        data: input.profileIds.map((id) => ({ type: "profile", id })),
      },
    });
  },
};

export default removeProfilesFromList;
