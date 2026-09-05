import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  newListName: string;
  signupForm: "public" | "private";
}

interface Output {
  message?: string;
}

/**
 * `POST /updatelistdetails` — verified against
 * `https://www.zoho.com/campaigns/help/developers/update-list.html`. Renames
 * a list and/or toggles whether its signup form is public or private.
 */
const listUpdate: ActionDefinition<Input, Output> = {
  key: "list-update",
  type: "perform",
  resource: "list",
  title: "Update Mailing List",
  description: "Rename a mailing list or change whether its signup form is public or private.",
  idempotent: true,
  params: [
    listKey,
    { key: "newListName", label: "New list name", type: "string", required: true },
    {
      key: "signupForm",
      label: "Signup form",
      type: "select",
      required: true,
      options: [{ value: "public", label: "Public" }, { value: "private", label: "Private" }],
    },
  ],
  output: [{ key: "message", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ message?: string }>(
      "updatelistdetails",
      {
        method: "POST",
        query: {
          listkey: input.listKey,
          newlistname: input.newListName,
          signupform: input.signupForm,
        },
      },
    );
    return { message: body.message };
  },
};

export default listUpdate;
