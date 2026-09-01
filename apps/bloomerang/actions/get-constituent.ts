import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/**
 * `GET /constituent/{id}` — one constituent (individual, organization, or
 * household member) by its Bloomerang API id.
 *
 * Note Bloomerang's own distinction, confirmed in the OpenAPI schema: this
 * `id` is "the ID of the constituent used in the API", which is **not** the
 * same as `AccountNumber`, the user-friendly number shown in the Bloomerang
 * CRM UI. Use the id returned by Search Constituents or List Constituents.
 */
const getConstituent: ActionDefinition<Input> = {
  key: "get-constituent",
  type: "read",
  resource: "constituent",
  title: "Get Constituent",
  description: "Fetch a single constituent by its Bloomerang API id (not the Account Number).",
  params: [
    {
      key: "id",
      label: "Constituent ID",
      type: "number",
      required: true,
      hint: "The API id, e.g. from Search Constituents — not the Account Number shown in the UI.",
    },
  ],
  output: [{ key: "Id", type: "number", label: "Constituent ID" }],

  execute(input, ctx) {
    return new BloomerangClient(ctx).request(`/constituent/${encodeURIComponent(input.id)}`);
  },
};

export default getConstituent;
