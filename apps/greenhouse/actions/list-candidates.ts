import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, dateFilter, HarvestClient, type HarvestPage } from "../lib/client.ts";
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
 * `GET /v3/candidates` — the people in Greenhouse, one row per person.
 *
 * A candidate is a *person*, not an application: the same candidate can be on
 * several jobs at once, and their journey on each job lives on
 * `/v3/applications`. Nothing about a job, a stage or a rejection is on this
 * object.
 *
 * There is deliberately no "retrieve candidate" action. Harvest v3 has no
 * `GET /v3/candidates/{id}` — the single-record endpoints v1 offered were
 * folded into the list, so fetching one candidate is `ids=12345`.
 */
interface Input extends BaseListInput {
  email?: string;
  tag?: string;
  isPrivate?: boolean;
  customFieldOptionId?: number;
  lastActivityAtOperator?: string;
  lastActivityAt?: string;
}

const listCandidates: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-candidates",
  type: "search",
  resource: "candidate",
  title: "List Candidates",
  description:
    "List candidates (people), optionally filtered by e-mail, tag, privacy, custom field option " +
    "or timestamp.",
  params: [
    {
      key: "email",
      label: "E-mail address",
      type: "string",
      hint: "Exact match against any of the candidate's e-mail addresses — the usual way to " +
        'answer "do we already have this person?" before creating a duplicate.',
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Candidates carrying this tag. Tag names come from the Candidate Tags dictionary.",
    },
    {
      key: "isPrivate",
      label: "Private candidates only",
      type: "boolean",
      hint: "Private candidates are visible only to users explicitly given access. Omit to " +
        "include both.",
    },
    {
      key: "customFieldOptionId",
      label: "Custom field option id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Candidates whose custom field is set to this option id.",
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
      hint: "Only takes effect together with the timestamp below.",
    },
    { key: "lastActivityAt", label: "Last activity at", type: "datetime" },
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Candidates"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/candidates", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        email: input.email,
        tag: input.tag,
        private: input.isPrivate,
        custom_field_option_id: input.customFieldOptionId,
        last_activity_at: dateFilter(input.lastActivityAtOperator, input.lastActivityAt),
      }),
    });
  },
};

export default listCandidates;
