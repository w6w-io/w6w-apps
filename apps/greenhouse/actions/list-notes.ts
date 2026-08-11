import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, HarvestClient, type HarvestPage, idList } from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  noteTypeOptions,
  noteVisibilityFilterOptions,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/notes` — the candidate activity feed.
 *
 * Everything written about a candidate: hand-typed notes, logged e-mails,
 * interview activity, take-home tests, LinkedIn InMails, touchpoints. Thirteen
 * `type` values, of which only three can be created through the API.
 *
 * ## The visibility vocabulary is different here than on the write side
 *
 * Reading gives you `publicly_visible | privately_visible | admin_only_visible`.
 * Creating requires `public | private | admin_only`. Same three concepts, two
 * spellings, and sending a read spelling to `create-note` is a 422. The two
 * option lists are kept separate in `lib/params.ts` for exactly that reason.
 *
 * ## Bodies come in pairs
 *
 * `body` is plain text; `body_with_tags` carries Greenhouse's markup. Choose
 * deliberately before piping either into an e-mail or a chat message.
 */
interface Input extends BaseListInput {
  candidateIds?: string;
  applicationIds?: string;
  userIds?: string;
  type?: string;
  visibility?: string;
}

const listNotes: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-notes",
  type: "search",
  resource: "candidate",
  title: "List Notes",
  description: "List candidate notes and activity-feed entries, scoped by candidate, application " +
    "or author.",
  params: [
    { key: "candidateIds", label: "Candidate ids", type: "string", hint: "Comma-separated." },
    { key: "applicationIds", label: "Application ids", type: "string", hint: "Comma-separated." },
    {
      key: "userIds",
      label: "Author user ids",
      type: "string",
      hint: "Comma-separated Greenhouse user ids.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: noteTypeOptions,
      hint: "All thirteen types are readable; only NOTE, ACTIVITY and EMAIL can be created " +
        "through the API.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: noteVisibilityFilterOptions,
      hint: "These are the READ spellings. The create action uses public / private / admin_only " +
        "instead.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Notes"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/notes", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        candidate_ids: idList(input.candidateIds, "candidateIds"),
        application_ids: idList(input.applicationIds, "applicationIds"),
        user_ids: idList(input.userIds, "userIds"),
        type: input.type,
        visibility: input.visibility,
      }),
    });
  },
};

export default listNotes;
