import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  organisationName: string;
  phone?: string;
  website?: string;
  background?: string;
}

const organisationCreate: ActionDefinition<Input> = {
  key: "organisation-create",
  type: "perform",
  resource: "organisation",
  title: "Create Organisation",
  description: "Create an organisation.",
  idempotent: false,
  params: [
    { key: "organisationName", label: "Name", type: "string", required: true },
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
      method: "POST",
      body: compact({
        ORGANISATION_NAME: input.organisationName,
        PHONE: unset(input.phone),
        WEBSITE: unset(input.website),
        BACKGROUND: unset(input.background),
      }),
    });
  },
};

export default organisationCreate;
