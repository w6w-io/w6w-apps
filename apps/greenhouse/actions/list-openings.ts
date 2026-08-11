import type { ActionDefinition } from "@w6w/types";
import {
  buildListQuery,
  dateFilter,
  HarvestClient,
  type HarvestPage,
  idList,
} from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/openings` — the individual headcount slots on a job.
 *
 * One job with three openings is three hires. An opening closes when someone is
 * hired into it, which is why `hire-application` takes an `opening_id`: on a job
 * with more than one open slot Greenhouse cannot guess which one the hire fills.
 *
 * Two id fields, and they are not the same thing: `id` is Greenhouse's numeric
 * primary key, `opening_id` is the customer-facing label they type ("ENG-12").
 * The `opening_id` filter matches the label; `ids` matches the primary key.
 */
interface Input extends BaseListInput {
  jobIds?: string;
  applicationIds?: string;
  closeReasonIds?: string;
  open?: boolean;
  openingId?: string;
  closedAtOperator?: string;
  closedAt?: string;
}

const listOpenings: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-openings",
  type: "search",
  resource: "job",
  title: "List Openings",
  description: "List the headcount openings on jobs, filtered by job, state or close reason.",
  params: [
    { key: "jobIds", label: "Job ids", type: "string", hint: "Comma-separated." },
    {
      key: "applicationIds",
      label: "Application ids",
      type: "string",
      hint: "Comma-separated. Returns the openings those applications were hired into.",
    },
    {
      key: "open",
      label: "Open only",
      type: "boolean",
      hint: "On returns unfilled openings, off returns closed ones. Omit for both.",
    },
    {
      key: "openingId",
      label: "Opening id (label)",
      type: "string",
      placeholder: "ENG-12",
      hint: "The customer-facing opening label, not the numeric primary key. Use Ids below for " +
        "the primary key.",
    },
    {
      key: "closeReasonIds",
      label: "Close reason ids",
      type: "string",
      hint: "Comma-separated. Reason ids come from Greenhouse's close-reason dictionary.",
    },
    {
      key: "closedAtOperator",
      label: "Closed at — comparison",
      type: "select",
      options: [
        { value: "gte", label: "On or after (gte)" },
        { value: "gt", label: "After (gt)" },
        { value: "lte", label: "On or before (lte)" },
        { value: "lt", label: "Before (lt)" },
      ],
    },
    { key: "closedAt", label: "Closed at", type: "datetime" },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Openings"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/openings", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        job_ids: idList(input.jobIds, "jobIds"),
        application_ids: idList(input.applicationIds, "applicationIds"),
        close_reason_ids: idList(input.closeReasonIds, "closeReasonIds"),
        open: input.open,
        opening_id: input.openingId,
        closed_at: dateFilter(input.closedAtOperator, input.closedAt),
      }),
    });
  },
};

export default listOpenings;
