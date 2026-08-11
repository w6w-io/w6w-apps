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
  scorecardStatusOptions,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/scorecards` — interview feedback.
 *
 * A scorecard is `draft` until the interviewer submits it and `complete`
 * afterwards, so an unfiltered feedback report includes half-written drafts.
 *
 * Two people appear on each row and they are not always the same: `interviewer_id`
 * is who did the interview, `submitter_id` is who filed the feedback (a
 * coordinator entering it on someone's behalf, say). Both are offered as filters
 * because "how many interviews did X run" and "whose feedback is outstanding"
 * are different questions.
 *
 * Notes arrive in doubled fields — `notes` and `notes_with_tags`, `private_notes`
 * and `private_notes_with_tags`. The `_with_tags` variants carry HTML markup;
 * the plain ones are text. Rendering the wrong one into an e-mail is how tags
 * leak as literal angle brackets.
 */
interface Input extends BaseListInput {
  applicationIds?: string;
  interviewerIds?: string;
  submitterIds?: string;
  interviewKitIds?: string;
  status?: string;
  submittedAtOperator?: string;
  submittedAt?: string;
}

const listScorecards: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-scorecards",
  type: "search",
  resource: "interview",
  title: "List Scorecards",
  description: "List interview scorecards, scoped by application, interviewer, submitter or kit.",
  params: [
    { key: "applicationIds", label: "Application ids", type: "string", hint: "Comma-separated." },
    {
      key: "interviewerIds",
      label: "Interviewer user ids",
      type: "string",
      hint: "Comma-separated. Who conducted the interview.",
    },
    {
      key: "submitterIds",
      label: "Submitter user ids",
      type: "string",
      hint: "Comma-separated. Who filed the feedback, which is not always the interviewer.",
    },
    {
      key: "interviewKitIds",
      label: "Interview kit ids",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: scorecardStatusOptions,
      hint: "Filter to `complete` for anything that reports on feedback — drafts are visible " +
        "here too.",
    },
    {
      key: "submittedAtOperator",
      label: "Submitted at — comparison",
      type: "select",
      options: [
        { value: "gte", label: "On or after (gte)" },
        { value: "gt", label: "After (gt)" },
        { value: "lte", label: "On or before (lte)" },
        { value: "lt", label: "Before (lt)" },
      ],
    },
    { key: "submittedAt", label: "Submitted at", type: "datetime" },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Scorecards"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/scorecards", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        application_ids: idList(input.applicationIds, "applicationIds"),
        interviewer_ids: idList(input.interviewerIds, "interviewerIds"),
        submitter_ids: idList(input.submitterIds, "submitterIds"),
        interview_kit_ids: idList(input.interviewKitIds, "interviewKitIds"),
        status: input.status,
        submitted_at: dateFilter(input.submittedAtOperator, input.submittedAt),
      }),
    });
  },
};

export default listScorecards;
