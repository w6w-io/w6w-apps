import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, ReplyClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `POST /v3/contacts/filter` — a filtered, sorted page of contacts that a plain
 * email/LinkedIn lookup (`contact-list`) can't express: field rules
 * (`property`/`condition`/`value`), scoping by list/sequence/step, a free-text
 * search term, and a sort order. Requires `contacts:read`.
 */
interface Input {
  top?: number;
  skip?: number;
  rules?: unknown;
  listId?: number;
  sequenceId?: number;
  sequenceStepId?: number;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: string;
}

const contactFilter: ActionDefinition<Input> = {
  key: "contact-filter",
  type: "search",
  resource: "contact",
  title: "Filter Contacts",
  description: "Search contacts with field rules, list/sequence scoping, and free text — more " +
    "than a plain email or LinkedIn lookup can express.",
  params: [
    {
      key: "rules",
      label: "Rules",
      type: "json",
      hint: 'Array of `{"property": "...", "condition": "...", "value": "..."}`. Leave empty for ' +
        "no field filtering.",
    },
    { key: "listId", label: "Contact list ID", type: "number" },
    { key: "sequenceId", label: "Sequence ID", type: "number" },
    { key: "sequenceStepId", label: "Sequence step ID", type: "number" },
    { key: "searchTerm", label: "Search term", type: "string" },
    { key: "sortBy", label: "Sort by", type: "string" },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "hasMore", type: "boolean", label: "Whether more contacts match past this page" },
  ],

  execute(input, ctx) {
    const body = compact({
      rules: input.rules === undefined ? undefined : asJson(input.rules, "Rules"),
      listId: input.listId,
      sequenceId: input.sequenceId,
      sequenceStepId: input.sequenceStepId,
      searchTerm: input.searchTerm,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });
    return new ReplyClient(ctx).list("/contacts/filter", {
      method: "POST",
      query: { top: input.top, skip: input.skip },
      body,
    });
  },
};

export default contactFilter;
