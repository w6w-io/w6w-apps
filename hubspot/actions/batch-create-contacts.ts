import type { ActionDefinition } from "@w6w/types";
import { crmBatchCreate, type CrmBatchCreateInput } from "../lib/crm.ts";

const batchCreateContacts: ActionDefinition<CrmBatchCreateInput> = {
  key: "batch-create-contacts",
  type: "perform",
  resource: "contact",
  title: "Batch Create Contacts",
  description: "Create up to 100 contacts in one call.",
  params: [
    {
      key: "inputs",
      label: "Inputs",
      type: "json",
      required: true,
      hint: "Array of `{ properties: { … } }` objects. Up to 100.",
    },
  ],

  async execute(input, ctx) {
    return crmBatchCreate(ctx, "contacts", input);
  },
};

export default batchCreateContacts;
