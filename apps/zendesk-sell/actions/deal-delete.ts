import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const dealDelete: ActionDefinition<Input> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description:
    "Delete a deal and remove all of its associated contacts in one call. Cannot be undone.",
  idempotent: true,
  params: [
    { key: "id", label: "Deal ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new SellClient(ctx).remove(`/deals/${encodeURIComponent(String(input.id))}`);
    return {};
  },
};

export default dealDelete;
