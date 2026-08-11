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
  interviewStatusOptions,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/interviews` — scheduled interviews.
 *
 * These are calendar events, so two pairs of date fields exist and only one pair
 * is populated per row: `starts_at`/`ends_at` for a timed interview and
 * `all_day_start_on`/`all_day_end_on` for an all-day one. A filter on
 * `starts_at` therefore silently excludes every all-day interview, which is
 * exactly the sort of thing that makes an "interviews this week" digest look
 * right and be wrong.
 */
interface Input extends BaseListInput {
  applicationIds?: string;
  jobIds?: string;
  organizerIds?: string;
  status?: string;
  externalEventId?: string;
  startsAtOperator?: string;
  startsAt?: string;
}

const listInterviews: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-interviews",
  type: "search",
  resource: "interview",
  title: "List Interviews",
  description: "List scheduled interviews, scoped by application, job, organiser or status.",
  params: [
    { key: "applicationIds", label: "Application ids", type: "string", hint: "Comma-separated." },
    { key: "jobIds", label: "Job ids", type: "string", hint: "Comma-separated." },
    {
      key: "organizerIds",
      label: "Organiser user ids",
      type: "string",
      hint: "Comma-separated Greenhouse user ids.",
    },
    { key: "status", label: "Status", type: "select", options: interviewStatusOptions },
    {
      key: "externalEventId",
      label: "External calendar event id",
      type: "string",
      hint: "The id of the matching event in the connected calendar, when Greenhouse recorded " +
        "one.",
    },
    {
      key: "startsAtOperator",
      label: "Starts at — comparison",
      type: "select",
      options: [
        { value: "gte", label: "On or after (gte)" },
        { value: "gt", label: "After (gt)" },
        { value: "lte", label: "On or before (lte)" },
        { value: "lt", label: "Before (lt)" },
      ],
      hint: "Only matches timed interviews. All-day interviews carry all_day_start_on instead " +
        "and are excluded by this filter entirely.",
    },
    { key: "startsAt", label: "Starts at", type: "datetime" },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Interviews"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/interviews", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        application_ids: idList(input.applicationIds, "applicationIds"),
        job_ids: idList(input.jobIds, "jobIds"),
        organizer_ids: idList(input.organizerIds, "organizerIds"),
        status: input.status,
        external_event_id: input.externalEventId,
        starts_at: dateFilter(input.startsAtOperator, input.startsAt),
      }),
    });
  },
};

export default listInterviews;
