import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  organisationId: number;
  organisationName?: string;
  phone?: string;
  website?: string;
  background?: string;
}

const organisationUpdate: ActionDefinition<Input> = {
  key: "organisation-update",
  type: "perform",
  resource: "organisation",
  title: "Update Organisation",
  description: "Change an organisation's fields. Only the ones you set are touched.",
  idempotent: true,
  params: [
    { key: "organisationId", label: "Organisation ID", type: "number", required: true },
    { key: "organisationName", label: "Name", type: "string" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    { key: "website", label: "Website", type: "string", row: "contact" },
    { key: "background", label: "Background", type: "text", advanced: true },
  ],
  output: [
    { key: "ORGANISATION_ID", type: "number", label: "Organisation ID" },
    { key: "ORGANISATION_NAME", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request("/Organisations", {
      method: "PUT",
      body: compact({
        ORGANISATION_ID: input.organisationId,
        ORGANISATION_NAME: unset(input.organisationName),
        PHONE: unset(input.phone),
        WEBSITE: unset(input.website),
        BACKGROUND: unset(input.background),
      }),
    });
  },
};

export default organisationUpdate;
