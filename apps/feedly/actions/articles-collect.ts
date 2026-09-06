import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/streams/contents` — page through a stream's articles.
 *
 * Verified against the "Collect articles from streamId" reference page
 * (fetched 2026-09-06): `servers: ["https://api.feedly.com/v3/streams/"]`,
 * path `/contents?`, so the full path is `/v3/streams/contents`.
 *
 * A "stream" is any of a team AI Feed, folder or board — Feedly addresses
 * them all through one opaque `streamId` string
 * (`enterprise/<team>/category/<uuid>` for a folder,
 * `enterprise/<team>/tag/<uuid>` for a board,
 * `feed/https://feedly.com/f/alert/<uuid>` for an AI Feed). This action does
 * not attempt to construct one — get it from `folders-list`, `boards-list` or
 * `ai-feeds-list`, or copy it from Feedly's own UI (Sharing → Copy stream
 * id), exactly as the "Building your first TI integration" guide describes.
 *
 * ## Pagination
 *
 * `count` maxes out at 100 per the vendor's own description ("Pick a number
 * between 1 and 100"); paging further uses the `continuation` token the
 * previous call returned, per the Introduction page's pagination section.
 */

interface Input {
  streamId: string;
  count?: number;
  newerThan?: number;
  olderThan?: number;
  continuation?: string;
  includeAiActions?: boolean;
  similar?: boolean;
}

const articlesCollect: ActionDefinition<Input> = {
  key: "articles-collect",
  type: "read",
  resource: "articles",
  title: "Collect Articles",
  description: 'Page through the articles in a team AI Feed, folder or board (a "stream").',
  params: [
    {
      key: "streamId",
      label: "Stream ID",
      type: "string",
      required: true,
      hint: "e.g. enterprise/acme/category/<uuid> (folder), enterprise/acme/tag/<uuid> (board), " +
        "or feed/https://feedly.com/f/alert/<uuid> (AI Feed). From folders-list / boards-list / " +
        "ai-feeds-list, or Feedly's own Sharing → Copy stream id.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 20,
      hint: "Between 1 and 100 (vendor default is 20).",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "newerThan",
      label: "Newer than (epoch ms)",
      type: "number",
      hint: "Cannot be older than 31 days ago.",
    },
    { key: "olderThan", label: "Older than (epoch ms)", type: "number" },
    {
      key: "continuation",
      label: "Continuation token",
      type: "string",
      hint: "From a previous call's response, to fetch the next page.",
    },
    {
      key: "includeAiActions",
      label: "Include AI Actions",
      type: "boolean",
      default: true,
    },
    {
      key: "similar",
      label: "Include related-entry counts",
      type: "boolean",
      default: true,
      hint: "When true, numRelatedEntries is returned per article.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Stream ID (echoed back)" },
    { key: "updated", type: "number", label: "Timestamp of this call" },
    { key: "continuation", type: "string", label: "Pass this to fetch the next page" },
    { key: "items", type: "array", label: "Articles" },
  ],

  async execute(input, ctx) {
    return await new FeedlyClient(ctx).json("/v3/streams/contents", {
      query: {
        streamId: input.streamId,
        count: input.count,
        newerThan: input.newerThan,
        olderThan: input.olderThan,
        continuation: input.continuation,
        includeAiActions: input.includeAiActions,
        similar: input.similar,
      },
    });
  },
};

export default articlesCollect;
