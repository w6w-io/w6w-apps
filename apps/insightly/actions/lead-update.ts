import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  leadId: number;
  lastName?: string;
  firstName?: string;
  organisationName?: string;
  title?: string;
  email?: string;
  phone?: string;
  leadSourceId?: number;
  leadStatusId?: number;
  leadDescription?: string;
}

const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Change a lead's fields. Only the ones you set are touched.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "organisationName", label: "Organisation name", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    {
      key: "leadSourceId",
      label: "Lead Source ID",
      type: "number",
      advanced: true,
      hint: "Look up valid ids via GET /LeadSources for this account.",
    },
    {
      key: "leadStatusId",
      label: "Lead Status ID",
      type: "number",
      advanced: true,
      hint: "Look up valid ids via GET /LeadStatuses for this account.",
    },
    { key: "leadDescription", label: "Description", type: "text", advanced: true },
  ],
  output: [
    { key: "LEAD_ID", type: "number", label: "Lead ID" },
    { key: "FIRST_NAME", type: "string", label: "First name" },
    { key: "LAST_NAME", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request("/Leads", {
      method: "PUT",
      body: compact({
        LEAD_ID: input.leadId,
        LAST_NAME: unset(input.lastName),
        FIRST_NAME: unset(input.firstName),
        ORGANISATION_NAME: unset(input.organisationName),
        TITLE: unset(input.title),
        EMAIL: unset(input.email),
        PHONE: unset(input.phone),
        LEAD_SOURCE_ID: input.leadSourceId,
        LEAD_STATUS_ID: input.leadStatusId,
        LEAD_DESCRIPTION: unset(input.leadDescription),
      }),
    });
  },
};

export default leadUpdate;
