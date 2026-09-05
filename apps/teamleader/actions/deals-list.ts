import type { ActionDefinition } from "@w6w/types";
import { callWithMeta, compact } from "../lib/client.ts";
import { idsParam, pageBody, pageParams } from "../lib/params.ts";

/**
 * `POST /deals.list` — verified against
 * `developer.focus.teamleader.eu/docs/api/deals-list` on 2026-09-01.
 */
interface Input {
  ids?: string[];
  term?: string;
  customerType?: "contact" | "company";
  customerId?: string;
  phaseId?: string;
  responsibleUserId?: string;
  updatedSince?: string;
  createdBefore?: string;
  status?: Array<"open" | "won" | "lost">;
  pipelineIds?: string[];
  pageSize?: number;
  pageNumber?: number;
  includes?: string;
}

interface PageMeta {
  page?: { size?: number; number?: number };
  matches?: number;
}

const dealsList: ActionDefinition<Input> = {
  key: "deals-list",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description: "Get a list of deals, optionally filtered by customer, phase, status, pipeline " +
    "or a free-text search term.",
  params: [
    idsParam,
    {
      key: "term",
      label: "Search term",
      type: "string",
      hint: "Filters on the title, reference and customer's name.",
    },
    {
      key: "customerType",
      label: "Customer type",
      type: "select",
      options: [{ value: "contact", label: "Contact" }, { value: "company", label: "Company" }],
      hint: "Pair with Customer ID to filter on one specific customer.",
    },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "phaseId", label: "Phase ID", type: "string" },
    { key: "responsibleUserId", label: "Responsible user ID", type: "string" },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "This is the deal's last-activity timestamp; inclusive.",
    },
    { key: "createdBefore", label: "Created before", type: "datetime", hint: "Inclusive." },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "open", label: "Open" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
      ],
    },
    {
      key: "pipelineIds",
      label: "Pipeline IDs",
      type: "json",
      hint: "Array of pipeline UUIDs.",
    },
    ...pageParams(),
    {
      key: "includes",
      label: "Includes",
      type: "string",
      placeholder: "custom_fields",
      hint: "Comma-separated list of optional includes.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Deals" },
    { key: "matches", type: "number", label: "Total matching deals" },
  ],

  async execute(input, ctx) {
    const customer = input.customerType && input.customerId
      ? { type: input.customerType, id: input.customerId }
      : undefined;

    const filter = compact({
      ids: input.ids,
      term: input.term,
      customer,
      phase_id: input.phaseId,
      responsible_user_id: input.responsibleUserId,
      updated_since: input.updatedSince,
      created_before: input.createdBefore,
      status: input.status,
      pipeline_ids: input.pipelineIds,
    });

    const { data, meta } = await callWithMeta<unknown[], PageMeta>(
      ctx,
      "deals.list",
      compact({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        page: pageBody(input),
        includes: input.includes,
      }),
    );

    return { items: data ?? [], matches: meta?.matches };
  },
};

export default dealsList;
