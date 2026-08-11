import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, dateFilter, HarvestClient, type HarvestPage } from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  createdAtParams,
  fieldsParam,
  idsParam,
  jobStatusOptions,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/jobs` — the roles being hired for.
 *
 * A job is `draft` while it is being scaffolded, `open` once it has openings,
 * and `closed` afterwards. Filter and response spell those three identically —
 * unlike applications, where they do not.
 *
 * `confidential` is worth knowing about before wiring a job feed into anything
 * public: Greenhouse hides confidential jobs from users without explicit access,
 * and an integration acting as a Site Admin sees them all.
 */
interface Input extends BaseListInput {
  status?: string;
  departmentId?: number;
  officeId?: number;
  requisitionId?: string;
  confidential?: boolean;
  openedAtOperator?: string;
  openedAt?: string;
}

const listJobs: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-jobs",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List jobs, optionally filtered by status, department, office or requisition id.",
  params: [
    { key: "status", label: "Status", type: "select", options: jobStatusOptions },
    {
      key: "departmentId",
      label: "Department id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "A single id, not a list — this filter is scalar in the API.",
    },
    {
      key: "officeId",
      label: "Office id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "A single id, not a list.",
    },
    {
      key: "requisitionId",
      label: "Requisition id",
      type: "string",
      hint: "The customer's own requisition number, as entered in Greenhouse.",
    },
    {
      key: "confidential",
      label: "Confidential only",
      type: "boolean",
      hint: "On returns only confidential jobs, off only non-confidential ones. Omit for both — " +
        "and remember an integration acting as a Site Admin can see confidential jobs.",
    },
    {
      key: "openedAtOperator",
      label: "Opened at — comparison",
      type: "select",
      options: [
        { value: "gte", label: "On or after (gte)" },
        { value: "gt", label: "After (gt)" },
        { value: "lte", label: "On or before (lte)" },
        { value: "lt", label: "Before (lt)" },
      ],
    },
    { key: "openedAt", label: "Opened at", type: "datetime" },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Jobs"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/jobs", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        status: input.status,
        department_id: input.departmentId,
        office_id: input.officeId,
        requisition_id: input.requisitionId,
        confidential: input.confidential,
        opened_at: dateFilter(input.openedAtOperator, input.openedAt),
      }),
    });
  },
};

export default listJobs;
