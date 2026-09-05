import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";

interface Input {
  listName: string;
  signupForm: "public" | "private";
  listDescription?: string;
  emailIds?: string;
}

interface Output {
  listKey?: string;
  listName?: string;
}

/**
 * `POST /addlistandcontacts` (`mode=newlist` is fixed by this action) —
 * verified against
 * `https://www.zoho.com/campaigns/help/developers/add-new-list-contact.html`.
 * Creates a mailing list and, optionally, seeds it with up to ten contacts in
 * the same call.
 */
const listCreate: ActionDefinition<Input, Output> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create Mailing List",
  description:
    "Create a new mailing list, optionally seeding it with up to ten comma-separated email " +
    "addresses in the same call.",
  idempotent: false,
  params: [
    { key: "listName", label: "List name", type: "string", required: true },
    {
      key: "signupForm",
      label: "Signup form",
      type: "select",
      required: true,
      options: [{ value: "public", label: "Public" }, { value: "private", label: "Private" }],
    },
    { key: "listDescription", label: "Description", type: "text" },
    {
      key: "emailIds",
      label: "Email addresses",
      type: "string",
      hint: "Up to ten, comma-separated. Leave blank to create an empty list.",
    },
  ],
  output: [
    { key: "listKey", type: "string", label: "List key" },
    { key: "listName", type: "string", label: "List name" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { listkey?: string; listname?: string }
    >("addlistandcontacts", {
      method: "POST",
      query: {
        mode: "newlist",
        listname: input.listName,
        signupform: input.signupForm,
        listdescription: input.listDescription,
        emailids: input.emailIds,
      },
    });
    return { listKey: body.listkey, listName: body.listname };
  },
};

export default listCreate;
