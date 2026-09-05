import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  organisationId: number;
}

const organisationDelete: ActionDefinition<Input> = {
  key: "organisation-delete",
  type: "perform",
  resource: "organisation",
  title: "Delete Organisation",
  description: "Permanently delete an organisation. Insightly has no trash to recover it from.",
  idempotent: true,
  params: [
    { key: "organisationId", label: "Organisation ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InsightlyClient(ctx).request(`/Organisations/${input.organisationId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default organisationDelete;
