import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { contactOutput } from "../lib/params.ts";

interface Input {
  contactId: number;
  include?: string[];
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      advanced: true,
      hint: "Embed additional details in the response.",
      options: [
        { value: "owner", label: "Owner" },
        { value: "sales_accounts", label: "Accounts" },
        { value: "creater", label: "Creator" },
        { value: "updater", label: "Updater" },
        { value: "source", label: "Source" },
        { value: "campaign", label: "Campaign" },
      ],
    },
  ],
  output: contactOutput,

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("contact", `/contacts/${input.contactId}`, {
      query: { include: input.include?.length ? input.include.join(",") : undefined },
    });
  },
};

export default contactGet;
