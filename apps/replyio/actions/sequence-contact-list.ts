import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { paginationParams, sequenceIdParam } from "../lib/params.ts";

/**
 * `GET /v3/sequences/{id}/contacts` — who's enrolled in a sequence and where
 * each stands: status, current step, added date, opt-out, and call status.
 * Requires `sequences:read`.
 */
interface Input {
  id: number;
  top?: number;
  skip?: number;
  sort_by?: string;
  sort_direction?: string;
}

const sequenceContactList: ActionDefinition<Input> = {
  key: "sequence-contact-list",
  type: "read",
  resource: "sequence",
  title: "List Contacts in Sequence",
  description: "See who's enrolled in a sequence and where each stands: status, current step, " +
    "added date, opt-out, and call status.",
  params: [
    sequenceIdParam,
    {
      key: "sort_by",
      label: "Sort by",
      type: "select",
      options: [
        { value: "addingDate", label: "Adding date (default — newest first)" },
        { value: "email", label: "Email" },
        { value: "firstName", label: "First name" },
        { value: "lastName", label: "Last name" },
        { value: "company", label: "Company" },
        { value: "statusInSequence", label: "Status in sequence" },
      ],
    },
    {
      key: "sort_direction",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      hint: "Defaults to descending when a sort field is set.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Contacts in this sequence" },
    { key: "hasMore", type: "boolean", label: "Whether more contacts exist past this page" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).list(`/sequences/${input.id}/contacts`, {
      query: {
        top: input.top,
        skip: input.skip,
        sort_by: input.sort_by,
        sort_direction: input.sort_direction,
      },
    });
  },
};

export default sequenceContactList;
