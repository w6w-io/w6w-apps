import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  lastName: string;
  firstName?: string;
  organisationName?: string;
  title?: string;
  email?: string;
  phone?: string;
  leadSourceId?: number;
  leadStatusId?: number;
  leadDescription?: string;
}

/**
 * Insightly's own schema marks `LEAD_SOURCE_ID` and `LEAD_STATUS_ID` required
 * alongside `LAST_NAME` — but both are IDs into this account's own
 * configured picklists (`GET /LeadSources`, `GET /LeadStatuses`), not fixed
 * values this app can hardcode or default. They stay optional params with a
 * lookup hint; if an account requires them, Insightly's own 400 response
 * (surfaced verbatim by `InsightlyClient`) says so.
 */
const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a lead.",
  idempotent: false,
  params: [
    { key: "lastName", label: "Last name", type: "string", required: true, row: "name" },
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
      method: "POST",
      body: compact({
        LAST_NAME: input.lastName,
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

export default leadCreate;
