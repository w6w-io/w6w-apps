import type { ActionDefinition } from "@w6w/types";
import { crmBatchDelete, type CrmBatchDeleteInput } from "../lib/crm.ts";

const batchDeleteContacts: ActionDefinition<CrmBatchDeleteInput> = {
  key: "batch-delete-contacts",
  type: "perform",
  resource: "contact",
  title: "Batch Delete Contacts",
  description: "Archive up to 100 contacts in one call.",
  params: [
    { key: "ids", label: "IDs", type: "json", required: true, hint: "Array of contact IDs." },
  ],

  async execute(input, ctx) {
    return crmBatchDelete(ctx, "contacts", input);
  },
};

export default batchDeleteContacts;
