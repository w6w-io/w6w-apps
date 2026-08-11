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
 * `GET /v3/application_stages` — a candidate's stage history, one row per stage
 * occupied.
 *
 * This is the fact table for funnel reporting: each row is a join between an
 * application and a job interview stage, with `entered_at` and `exited_at`.
 * The row where `exited_at` is null (and `current` is true) is where the
 * candidate stands now.
 *
 * Filter by `current` when you want the present stage and by `application_ids`
 * when you want the whole path — asking for the path and taking the last row is
 * not the same thing, because rows are returned newest-id-first.
 */
interface Input extends BaseListInput {
  applicationIds?: string;
  jobInterviewStageIds?: string;
  current?: boolean;
}

const listApplicationStages: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-application-stages",
  type: "search",
  resource: "application",
  title: "List Application Stages",
  description: "List the stage history of applications — one row per stage entered, with " +
    "entered/exited timestamps.",
  params: [
    { key: "applicationIds", label: "Application ids", type: "string", hint: "Comma-separated." },
    {
      key: "jobInterviewStageIds",
      label: "Job interview stage ids",
      type: "string",
      hint: "Comma-separated. Finds every application that has touched these stages.",
    },
    {
      key: "current",
      label: "Current stage only",
      type: "boolean",
      hint: "On returns just the stage each application is sitting in now.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Application stages"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/application_stages", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        application_ids: idList(input.applicationIds, "applicationIds"),
        job_interview_stage_ids: idList(input.jobInterviewStageIds, "jobInterviewStageIds"),
        current: input.current,
      }),
    });
  },
};

export default listApplicationStages;
