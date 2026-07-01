import type { ActionDefinition } from "@w6w/types";
import { crmDelete } from "../lib/crm.ts";

interface Input {
  id: string;
}

const deleteCompany: ActionDefinition<Input> = {
  key: "delete-company",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description: "Archive a company (soft-delete).",
  params: [
    { key: "id", label: "Company ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return crmDelete(ctx, "companies", input);
  },
};

export default deleteCompany;
