import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  labelId: string;
}

/**
 * Fetch a single label by ID.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.labels/get
 */
const getLabel: ActionDefinition<Input> = {
  key: "get-label",
  type: "read",
  resource: "label",
  title: "Get Label",
  description: "Retrieve a single Gmail label by ID.",
  params: [
    { key: "labelId", label: "Label ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/labels/${input.labelId}`);
  },
};

export default getLabel;
