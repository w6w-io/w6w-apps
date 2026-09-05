import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/{gammaId}/comments` — verified against
 * `management/get-gamma-comments.md`. `updatedSince` enables efficient delta
 * polling — only threads with activity (including new replies) after that
 * timestamp come back.
 */
interface Input {
  gammaId: string;
  limit?: number;
  after?: string;
  updatedSince?: string;
  includeArchived?: boolean;
}

const listGammaComments: ActionDefinition<Input> = {
  key: "list-gamma-comments",
  type: "search",
  resource: "gamma",
  title: "List Gamma Comments",
  description:
    "List comment threads on a Gamma, cursor-paginated. Requires comment-level access on the " +
    "Gamma.",
  params: [
    { key: "gammaId", label: "Gamma ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-50.",
      advanced: true,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "From a previous response's nextCursor.",
      advanced: true,
    },
    {
      key: "updatedSince",
      label: "Updated Since",
      type: "datetime",
      hint: "ISO-8601 — only threads with activity after this timestamp.",
      advanced: true,
    },
    {
      key: "includeArchived",
      label: "Include Archived",
      type: "boolean",
      hint: "Include archived (deleted) comments and replies.",
      advanced: true,
    },
  ],
  output: [
    { key: "data", type: "array", label: "Comment threads" },
    { key: "hasMore", type: "boolean", label: "More results exist" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/gammas/${encodeURIComponent(input.gammaId)}/comments`,
      {
        query: compact({
          limit: input.limit,
          after: input.after,
          updatedSince: input.updatedSince,
          includeArchived: input.includeArchived,
        }),
      },
    );
  },
};

export default listGammaComments;
