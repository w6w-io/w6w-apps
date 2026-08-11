import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, HarvestClient, type HarvestPage, idList } from "../lib/client.ts";
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
 * `GET /v3/job_interview_stages` — a job's interview plan.
 *
 * The ordered stage *definitions* on a job ("Application Review", "Recruiter
 * Screen", "Onsite"), as distinct from `application_stages`, which records which
 * of them a given candidate has been through.
 *
 * This is the lookup `move-application` depends on: both `from_stage_id` and
 * `to_stage_id` on a move are ids from this list, and a move sent with an id
 * from the wrong table fails validation rather than moving the candidate
 * somewhere unexpected.
 */
interface Input extends BaseListInput {
  jobIds?: string;
  active?: boolean;
}

const listJobInterviewStages: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-job-interview-stages",
  type: "search",
  resource: "job",
  title: "List Job Interview Stages",
  description: "List the interview stages defined on jobs — the ids a move uses.",
  params: [
    { key: "jobIds", label: "Job ids", type: "string", hint: "Comma-separated." },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: "Retired stages stay on old applications, so omit this when reading history.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Job interview stages"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/job_interview_stages", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        job_ids: idList(input.jobIds, "jobIds"),
        active: input.active,
      }),
    });
  },
};

export default listJobInterviewStages;
