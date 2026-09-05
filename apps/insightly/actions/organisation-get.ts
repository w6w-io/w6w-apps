import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  organisationId: number;
}

const organisationGet: ActionDefinition<Input> = {
  key: "organisation-get",
  type: "read",
  resource: "organisation",
  title: "Get Organisation",
  description: "Fetch a single organisation by ID.",
  params: [
    { key: "organisationId", label: "Organisation ID", type: "number", required: true },
  ],
  output: [
    { key: "ORGANISATION_ID", type: "number", label: "Organisation ID" },
    { key: "ORGANISATION_NAME", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request(`/Organisations/${input.organisationId}`);
  },
};

export default organisationGet;
