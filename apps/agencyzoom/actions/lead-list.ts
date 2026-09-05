import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type BaseSearchResponse, compact } from "../lib/client.ts";
import { leadStatusOptions, pageParams } from "../lib/params.ts";

/**
 * `POST /v1/api/leads/list` — search leads with filters, pagination and sort.
 *
 * `startDate`/`endDate` filter by lead **creation** date and use `YYYY-MM-DD`
 * — a different format from the `MM/dd/YYYY` used by policy/opportunity dates
 * elsewhere in this app (see `lib/client.ts`).
 */
interface Input {
  id?: number;
  assignedTo?: number;
  status?: number;
  leadSourceId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  startDate?: string;
  endDate?: string;
  workflowId?: number;
  workflowStageId?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

interface Lead {
  id?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  status?: number;
  assignedTo?: number;
  pipelineId?: number;
  premium?: number;
  quoted?: number;
}

interface LeadSearchResponse extends BaseSearchResponse {
  leads?: Lead[];
  quoteAmount?: number;
}

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "Search Leads",
  description: "Search leads by status, source, assignee, contact info or creation date.",
  params: [
    { key: "id", label: "Lead ID", type: "number" },
    { key: "assignedTo", label: "Assigned to (producer/agent ID)", type: "number" },
    { key: "status", label: "Status", type: "select", options: leadStatusOptions },
    { key: "leadSourceId", label: "Lead source ID", type: "number" },
    { key: "customerName", label: "Name (prefix match)", type: "string" },
    { key: "customerEmail", label: "Email (prefix match)", type: "string" },
    { key: "customerPhone", label: "Phone (prefix match)", type: "string" },
    {
      key: "startDate",
      label: "Created on/after",
      type: "date",
      hint: "YYYY-MM-DD.",
    },
    {
      key: "endDate",
      label: "Created on/before",
      type: "date",
      hint: "YYYY-MM-DD.",
    },
    { key: "workflowId", label: "Pipeline ID", type: "number" },
    {
      key: "workflowStageId",
      label: "Stage ID(s)",
      type: "string",
      hint: "One stage ID, or several separated by '/' (e.g. stg2/stg3).",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "firstname", label: "First name" },
        { value: "lastname", label: "Last name" },
        { value: "lastEnterStageDate", label: "Last stage change (default)" },
        { value: "lastActivityDate", label: "Last activity" },
      ],
      default: "lastEnterStageDate",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    ...pageParams(100),
  ],
  output: [
    { key: "leads", type: "array", label: "Leads" },
    { key: "totalCount", type: "number", label: "Total matching leads" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<LeadSearchResponse>(
      "/leads/list",
      compact({ ...input }),
    );
  },
};

export default leadList;
