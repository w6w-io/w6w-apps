import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/search` — verified against `management/search-gammas.md`.
 *
 * "Search is being rolled out gradually and may not yet be available to all
 * accounts" — a `403` here means access hasn't been enabled, not a bad key;
 * `formatGammaError` surfaces the vendor's own message so that distinction
 * survives into the thrown error.
 */
interface Input {
  q?: string;
  createdBy?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  includeArchived?: boolean;
  limit?: number;
}

const searchGammas: ActionDefinition<Input> = {
  key: "search-gammas",
  type: "search",
  resource: "gamma",
  title: "Search Gammas",
  description:
    "Full-text search over gammas the caller can access, matched against titles and body " +
    "text. With no query and at least one filter, results are ordered by last-updated " +
    "descending. A 403 means search isn't enabled for this workspace yet.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      hint: "Optional when createdBy, updatedAfter, or updatedBefore is set.",
    },
    {
      key: "createdBy",
      label: "Created By",
      type: "string",
      hint: "'me', an email address, or a user ID.",
      advanced: true,
    },
    {
      key: "updatedAfter",
      label: "Updated After",
      type: "datetime",
      hint: "ISO-8601 lower bound (inclusive).",
      advanced: true,
    },
    {
      key: "updatedBefore",
      label: "Updated Before",
      type: "datetime",
      hint: "ISO-8601 upper bound (inclusive).",
      advanced: true,
    },
    {
      key: "includeArchived",
      label: "Include Archived",
      type: "boolean",
      advanced: true,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-25.",
      advanced: true,
    },
  ],
  output: [
    {
      key: "hits",
      type: "array",
      label: "Hits — { id, title, url, highlight, createdBy, updatedTime, archived }",
    },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/gammas/search", {
      query: compact({
        q: input.q,
        createdBy: input.createdBy,
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
        includeArchived: input.includeArchived,
        limit: input.limit,
      }),
    });
  },
};

export default searchGammas;
