import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, compact, type GenericSuccessResponse } from "../lib/client.ts";

/**
 * `PUT /v1/api/leads/{leadId}` — update a personal lead.
 *
 * ## This is a full replace, not a patch
 *
 * The vendor's own words: **"If no parameter is provided, the existing data
 * will be deleted."** Omitting `notes`, `phone`, or any other optional field
 * does not leave it untouched — it clears it. Fetch the lead first
 * (`lead-get`) and pass every field you want to keep, not just the ones
 * you're changing.
 *
 * `pipelineId`/`stageId` are optional here (unlike `lead-create`, which
 * requires both) — use `lead-change-status`/the stage endpoint instead if you
 * only mean to move a lead through its pipeline, since this action will
 * otherwise happily overwrite pipeline placement to whatever you pass (or
 * clear it, per the rule above, if you pass neither).
 */
interface Input {
  leadId: number;
  firstname: string;
  lastname?: string;
  email: string;
  phone?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  notes?: string;
  pipelineId?: number;
  stageId?: number;
  contactDate?: string;
  soldDate?: string;
  leadSourceId: number;
  assignmentGroupId?: number;
  xDate?: string;
  quoteDate?: string;
  assignTo: number;
  csrId?: number;
  streetAddress?: string;
  city?: string;
  state?: string;
  country: string;
  zip?: string;
  tagNames?: string;
  middlename?: string;
  birthday?: string;
  nickname?: string;
}

const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description:
    "Replace a personal lead's data. Any field left blank is CLEARED, not left unchanged — " +
    "fetch the lead first and pass its full data back if you only mean to change one field.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string" },
    { key: "secondaryEmail", label: "Secondary email", type: "string" },
    { key: "secondaryPhone", label: "Secondary phone", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "pipelineId", label: "Pipeline ID", type: "number" },
    { key: "stageId", label: "Stage ID", type: "number" },
    { key: "contactDate", label: "Last contact date", type: "string", hint: "YYYY-MM-DD." },
    { key: "soldDate", label: "Sold date", type: "string", hint: "YYYY-MM-DD." },
    { key: "leadSourceId", label: "Lead source ID", type: "number", required: true },
    { key: "assignmentGroupId", label: "Assignment group ID", type: "number" },
    { key: "xDate", label: "X-date", type: "string", hint: "YYYY-MM-DD." },
    { key: "quoteDate", label: "Quoted date", type: "string", hint: "YYYY-MM-DD." },
    { key: "assignTo", label: "Assigned to (producer/agent ID)", type: "number", required: true },
    { key: "csrId", label: "CSR ID", type: "number" },
    { key: "streetAddress", label: "Street address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "country", label: "Country", type: "string", required: true },
    { key: "zip", label: "Postal code", type: "string" },
    { key: "tagNames", label: "Tags", type: "string", hint: "Multiple tags separated by ';'." },
    { key: "middlename", label: "Middle name", type: "string" },
    { key: "birthday", label: "Birthday", type: "string", hint: "mm/dd/yy." },
    { key: "nickname", label: "Nickname", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  execute(input, ctx) {
    const { leadId, ...body } = input;
    return new AgencyZoomClient(ctx).put<GenericSuccessResponse>(
      `/leads/${leadId}`,
      compact(body),
    );
  },
};

export default leadUpdate;
