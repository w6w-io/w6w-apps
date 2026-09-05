import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, compact, type GenericSuccessResponse } from "../lib/client.ts";

/**
 * `POST /v1/api/leads/create` — create a personal lead.
 *
 * `pipelineId`/`stageId` must be a matching pair from the SAME pipeline — use
 * `pipeline-stage-list` to find both together, not `pipeline-list` (id/name
 * only) plus a guessed stage.
 *
 * Every date field here (`contactDate`, `soldDate`, `xDate`, `quoteDate`) is a
 * free-text string in `YYYY-MM-DD`, per the vendor's own examples — a
 * DIFFERENT format from the `MM/dd/YYYY` this app's policy/opportunity actions
 * use. `birthday`/`nextExpirationDate` are `mm/dd/yy` again. See
 * `lib/client.ts`.
 */
interface Input {
  firstname: string;
  lastname?: string;
  email: string;
  phone?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  notes?: string;
  pipelineId: number;
  stageId: number;
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

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new personal lead in a pipeline stage.",
  idempotent: false,
  params: [
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string" },
    { key: "secondaryEmail", label: "Secondary email", type: "string" },
    { key: "secondaryPhone", label: "Secondary phone", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "number",
      required: true,
      hint: "From List Pipelines & Stages.",
    },
    {
      key: "stageId",
      label: "Stage ID",
      type: "number",
      required: true,
      hint: "Must belong to the pipeline above — from List Pipelines & Stages.",
    },
    { key: "contactDate", label: "Last contact date", type: "string", hint: "YYYY-MM-DD." },
    { key: "soldDate", label: "Sold date", type: "string", hint: "YYYY-MM-DD." },
    {
      key: "leadSourceId",
      label: "Lead source ID",
      type: "number",
      required: true,
      hint: "From List Lead Sources.",
    },
    { key: "assignmentGroupId", label: "Assignment group ID", type: "number" },
    { key: "xDate", label: "X-date", type: "string", hint: "YYYY-MM-DD." },
    { key: "quoteDate", label: "Quoted date", type: "string", hint: "YYYY-MM-DD." },
    {
      key: "assignTo",
      label: "Assigned to (producer/agent ID)",
      type: "number",
      required: true,
      hint: "From List Employees.",
    },
    { key: "csrId", label: "CSR ID", type: "number", hint: "From List CSRs." },
    { key: "streetAddress", label: "Street address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "country", label: "Country", type: "string", required: true },
    { key: "zip", label: "Postal code", type: "string" },
    {
      key: "tagNames",
      label: "Tags",
      type: "string",
      hint: "Multiple tags separated by ';'.",
    },
    { key: "middlename", label: "Middle name", type: "string" },
    { key: "birthday", label: "Birthday", type: "string", hint: "mm/dd/yy." },
    { key: "nickname", label: "Nickname", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "New lead ID" },
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<GenericSuccessResponse>(
      "/leads/create",
      compact({ ...input }),
    );
  },
};

export default leadCreate;
