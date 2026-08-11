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
  applicationStatusOptions,
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/applications` — a candidate's journey on one job.
 *
 * The bridge between a person and a job: one row per (candidate, job) pair, plus
 * prospect applications, which may be jobless or attached to several prospective
 * jobs at once.
 *
 * ## `status` means two different things in one field
 *
 * The filter accepts `active`; the response returns `in_process` for the very
 * same rows. Greenhouse's OpenAPI document declares both enums explicitly and
 * they differ by exactly that one member. Filtering on `in_process` is a 422,
 * and a downstream step comparing the returned `status` to `active` never
 * matches. See `lib/params.ts#applicationStatusOptions`.
 *
 * ## Stage filters: two ids, two meanings
 *
 * `stage_ids` filters by the *application-stage* rows on the application;
 * `job_interview_stage_ids` filters by the job's stage definitions. They are
 * different tables and not interchangeable, which is why both are offered rather
 * than one "stage" field that silently picks the wrong one.
 */
interface Input extends BaseListInput {
  candidateIds?: string;
  jobIds?: string;
  jobPostIds?: string;
  sourceIds?: string;
  stageIds?: string;
  jobInterviewStageIds?: string;
  status?: string;
  stageName?: string;
  prospect?: boolean;
  lastActivityAtOperator?: string;
  lastActivityAt?: string;
}

const listApplications: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-applications",
  type: "search",
  resource: "application",
  title: "List Applications",
  description:
    "List applications, scoped by candidate, job, job post, source, stage or lifecycle status.",
  params: [
    {
      key: "candidateIds",
      label: "Candidate ids",
      type: "string",
      hint: "Comma-separated. Every application belonging to these people.",
    },
    { key: "jobIds", label: "Job ids", type: "string", hint: "Comma-separated." },
    { key: "jobPostIds", label: "Job post ids", type: "string", hint: "Comma-separated." },
    {
      key: "sourceIds",
      label: "Source ids",
      type: "string",
      hint: "Comma-separated. Source names come from the List Sources action.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: applicationStatusOptions,
      hint: "Careful: the filter word and the returned word differ for in-process applications. " +
        "You filter for `active` and every row comes back saying `in_process`.",
    },
    {
      key: "prospect",
      label: "Prospects only",
      type: "boolean",
      hint: "On returns only prospect applications, off only real candidate applications. Omit " +
        "to include both.",
    },
    {
      key: "stageName",
      label: "Stage name",
      type: "string",
      hint: 'Exact stage name, e.g. "Application Review".',
    },
    {
      key: "stageIds",
      label: "Application stage ids",
      type: "string",
      hint: "Comma-separated ids of application-stage rows (from List Application Stages).",
    },
    {
      key: "jobInterviewStageIds",
      label: "Job interview stage ids",
      type: "string",
      hint: "Comma-separated ids of the job's stage definitions (from List Job Interview " +
        "Stages). A different table from the application stage ids above.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    {
      key: "lastActivityAtOperator",
      label: "Last activity — comparison",
      type: "select",
      options: [
        { value: "gte", label: "On or after (gte)" },
        { value: "gt", label: "After (gt)" },
        { value: "lte", label: "On or before (lte)" },
        { value: "lt", label: "Before (lt)" },
      ],
    },
    { key: "lastActivityAt", label: "Last activity at", type: "datetime" },
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Applications"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/applications", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        candidate_ids: idList(input.candidateIds, "candidateIds"),
        job_ids: idList(input.jobIds, "jobIds"),
        job_post_ids: idList(input.jobPostIds, "jobPostIds"),
        source_ids: idList(input.sourceIds, "sourceIds"),
        stage_ids: idList(input.stageIds, "stageIds"),
        job_interview_stage_ids: idList(input.jobInterviewStageIds, "jobInterviewStageIds"),
        status: input.status,
        stage_name: input.stageName,
        prospect: input.prospect,
        last_activity_at: dateFilter(input.lastActivityAtOperator, input.lastActivityAt),
      }),
    });
  },
};

export default listApplications;
