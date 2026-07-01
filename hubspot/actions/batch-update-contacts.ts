import type { ActionDefinition } from "@w6w/types";
import { crmBatchUpdate, type CrmBatchUpdateInput } from "../lib/crm.ts";

const batchUpdateContacts: ActionDefinition<CrmBatchUpdateInput> = {
  key: "batch-update-contacts",
  type: "perform",
  resource: "contact",
  title: "Batch Update Contacts",
  description: "Update up to 100 contacts in one call.",
  params: [
    {
      key: "inputs",
      label: "Inputs",
      type: "json",
      required: true,
      hint: "Array of `{ id, properties }` objects. Up to 100.",
    },
  ],

  async execute(input, ctx) {
    return crmBatchUpdate(ctx, "contacts", input);
  },
};

export default batchUpdateContacts;
