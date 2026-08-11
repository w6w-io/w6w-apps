import type { ActionDefinition } from "@w6w/types";
import { compact, MattermostClient } from "../lib/client.ts";

/**
 * `POST /api/v4/teams/{team_id}/posts/search` — search a team's posts.
 *
 * ## `is_or_search` is required, and there is no default
 *
 * Mattermost's schema marks both `terms` and `is_or_search` required. `false`
 * means every term must match, `true` means any. This action defaults it to
 * `false` (AND) — the behaviour a person expects from a search box — and says so
 * rather than letting the server reject a body that omitted it.
 *
 * ## The search modifiers live inside `terms`
 *
 * `from:someusername` and `in:somechannel` are part of the query string, not
 * separate parameters — and `in:` takes the channel's **name** (its URL handle),
 * not its display name. That distinction is exactly the one that makes a search
 * silently return nothing.
 *
 * ## `page` and `per_page` only work with Elasticsearch
 *
 * The vendor's own note. On a server using the default database search they are
 * ignored, so a workflow that pages through results will loop on page one
 * forever. The hint says so.
 */
interface Input {
  teamId: string;
  terms: string;
  isOrSearch?: boolean;
  includeDeletedChannels?: boolean;
  timeZoneOffset?: number;
  page?: number;
  perPage?: number;
}

const postSearch: ActionDefinition<Input> = {
  key: "post-search",
  type: "search",
  resource: "post",
  title: "Search Posts",
  description: "Search a team's posts, with Mattermost's `from:` and `in:` modifiers.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      hint: "Search is scoped to one team.",
    },
    {
      key: "terms",
      label: "Search terms",
      type: "string",
      required: true,
      placeholder: "deploy in:town-square from:ada",
      hint:
        "Modifiers go in the query itself: `from:<username>` and `in:<channel-name>`. `in:` takes " +
        "the channel's URL handle, not its display name.",
    },
    {
      key: "isOrSearch",
      label: "Match any term",
      type: "boolean",
      default: false,
      hint: "Off (the default) requires every term to match. On matches any of them.",
    },
    {
      key: "includeDeletedChannels",
      label: "Include archived channels",
      type: "boolean",
    },
    {
      key: "timeZoneOffset",
      label: "Timezone offset (seconds)",
      type: "number",
      validation: { integer: true },
      hint: "Offset from UTC, used when the query contains a date modifier such as `on:`.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Only honoured on servers running Elasticsearch — ignored by the database search.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Default 60. Elasticsearch only, as above.",
    },
  ],
  output: [
    { key: "order", type: "array", label: "Matching post ids, most relevant first" },
    { key: "posts", type: "object", label: "Posts keyed by id" },
    {
      key: "matches",
      type: "object",
      label: "Matched terms per post, when the backend reports them",
    },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/teams/${encodeURIComponent(input.teamId)}/posts/search`,
      {
        method: "POST",
        body: {
          terms: input.terms,
          // Required by the schema with no server-side default, so it is always
          // sent — `compact` would drop an explicit `false`, which is the value
          // this action defaults to.
          is_or_search: input.isOrSearch ?? false,
          ...compact({
            include_deleted_channels: input.includeDeletedChannels,
            time_zone_offset: input.timeZoneOffset,
            page: input.page,
            per_page: input.perPage,
          }),
        },
      },
    );
  },
};

export default postSearch;
