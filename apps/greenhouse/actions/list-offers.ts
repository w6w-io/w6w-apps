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
  offerStatusOptions,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/offers` — offers made against an application.
 *
 * Offers are **versioned**: an application accumulates one row per revision, and
 * superseded versions stay in the list with status `Deprecated`. A report that
 * counts rows without `current_only` counts drafts twice.
 *
 * The status vocabulary here is capitalised — `Created`, `Accepted`, `Rejected`,
 * `Deprecated` — unlike every other status in this API, which is lower snake
 * case. Sending `accepted` is a 422.
 */
interface Input extends BaseListInput {
  applicationIds?: string;
  jobIds?: string;
  candidateIds?: string;
  openingIds?: string;
  status?: string;
  currentOnly?: boolean;
  startsOnOperator?: string;
  startsOn?: string;
}

const listOffers: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-offers",
  type: "search",
  resource: "offer",
  title: "List Offers",
  description: "List offers, scoped by application, job, candidate or opening.",
  params: [
    { key: "applicationIds", label: "Application ids", type: "string", hint: "Comma-separated." },
    { key: "jobIds", label: "Job ids", type: "string", hint: "Comma-separated." },
    { key: "candidateIds", label: "Candidate ids", type: "string", hint: "Comma-separated." },
    { key: "openingIds", label: "Opening ids", type: "string", hint: "Comma-separated." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: offerStatusOptions,
      hint: "Capitalised, unlike every other status in this API.",
    },
    {
      key: "currentOnly",
      label: "Current version only",
      type: "boolean",
      hint: "Offers are versioned and superseded versions stay in the list. Turn this on unless " +
        "you specifically want the history.",
    },
    {
      key: "startsOnOperator",
      label: "Start date — comparison",
      type: "select",
      options: [
        { value: "gte", label: "On or after (gte)" },
        { value: "gt", label: "After (gt)" },
        { value: "lte", label: "On or before (lte)" },
        { value: "lt", label: "Before (lt)" },
      ],
    },
    { key: "startsOn", label: "Start date", type: "datetime" },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Offers"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/offers", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        application_ids: idList(input.applicationIds, "applicationIds"),
        job_ids: idList(input.jobIds, "jobIds"),
        candidate_ids: idList(input.candidateIds, "candidateIds"),
        opening_ids: idList(input.openingIds, "openingIds"),
        status: input.status,
        current_only: input.currentOnly,
        starts_on: dateFilter(input.startsOnOperator, input.startsOn),
      }),
    });
  },
};

export default listOffers;
