import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  personId?: number;
  cadenceId?: number;
  currentlyOnCadence?: boolean;
  perPage?: number;
  page?: number;
}

/** GET /v2/cadence_memberships — list/filter cadence memberships. */
const cadenceMembershipList: ActionDefinition<Input> = {
  key: "cadence-membership-list",
  type: "read",
  resource: "cadence-membership",
  title: "List Cadence Memberships",
  description: "List and filter cadence memberships.",
  params: [
    { key: "personId", label: "Person ID", type: "number" },
    { key: "cadenceId", label: "Cadence ID", type: "number" },
    {
      key: "currentlyOnCadence",
      label: "Currently on cadence",
      type: "boolean",
      hint:
        "true = only people currently on a cadence; false = only people who have finished/left one.",
    },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Cadence memberships" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/cadence_memberships", {
      query: compact({
        person_id: input.personId,
        cadence_id: input.cadenceId,
        currently_on_cadence: input.currentlyOnCadence,
        per_page: input.perPage,
        page: input.page,
      }),
    });
  },
};

export default cadenceMembershipList;
