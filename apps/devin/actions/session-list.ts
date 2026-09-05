import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  DevinClient,
  type DevinListPage,
  type DevinSession,
  type SearchResult,
  toList,
  toSearchResult,
} from "../lib/client.ts";
import { cursorParams, sessionCategoryOptions, sessionOriginOptions } from "../lib/params.ts";

/**
 * `GET /v3/organizations/{org_id}/sessions` — every session in the
 * organization, filterable and cursor-paginated.
 *
 * The vendor's `qs` query model documents many more filters than this app
 * exposes (`automation_ids`, `service_user_ids`, `user_ids`, `schedule_id`,
 * `repo_names`, `parent_session_id`) — those name org-admin/automation
 * concepts this app's small session-oriented surface does not otherwise
 * touch, so they are left off rather than padding the form with filters
 * nothing else here produces or consumes.
 */
interface Input {
  cursor?: string;
  limit?: number;
  isArchived?: boolean;
  tags?: string[] | string;
  sessionIds?: string[] | string;
  category?: string;
  origins?: string[] | string;
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  updatedBefore?: number;
}

const sessionList: ActionDefinition<Input, SearchResult<DevinSession>> = {
  key: "session-list",
  type: "search",
  resource: "session",
  title: "List Sessions",
  description: "List sessions in the organization, optionally filtered.",
  params: [
    ...cursorParams(100),
    { key: "isArchived", label: "Archived only", type: "boolean" },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      options: [],
      hint: "Sessions carrying any of these tags.",
    },
    {
      key: "sessionIds",
      label: "Session IDs",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "Narrow to specific devin-prefixed session ids.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: sessionCategoryOptions,
      advanced: true,
    },
    {
      key: "origins",
      label: "Origins",
      type: "multiselect",
      options: sessionOriginOptions,
      advanced: true,
    },
    {
      key: "createdAfter",
      label: "Created after",
      type: "number",
      advanced: true,
      hint: "Unix seconds. Inclusive.",
    },
    {
      key: "createdBefore",
      label: "Created before",
      type: "number",
      advanced: true,
      hint: "Unix seconds. Inclusive.",
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "number",
      advanced: true,
      hint: "Unix seconds. Inclusive.",
    },
    {
      key: "updatedBefore",
      label: "Updated before",
      type: "number",
      advanced: true,
      hint: "Unix seconds. Inclusive.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Sessions" },
    { key: "nextCursor", type: "string", label: "Pass into `cursor` for the next page" },
  ],

  async execute(input, ctx) {
    const page = await new DevinClient(ctx).org<DevinListPage<DevinSession>>("/sessions", {
      query: compact({
        after: input.cursor,
        first: input.limit,
        is_archived: input.isArchived,
        tags: toList(input.tags),
        session_ids: toList(input.sessionIds),
        category: input.category,
        origins: toList(input.origins),
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        updated_after: input.updatedAfter,
        updated_before: input.updatedBefore,
      }),
    });
    return toSearchResult(page);
  },
};

export default sessionList;
