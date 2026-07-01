import type { ActionDefinition } from "@w6w/types";
import { crmDelete } from "../lib/crm.ts";

interface Input {
  id: string;
}

const deleteDeal: ActionDefinition<Input> = {
  key: "delete-deal",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Archive a deal (soft-delete).",
  params: [
    { key: "id", label: "Deal ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return crmDelete(ctx, "deals", input);
  },
};

export default deleteDeal;
