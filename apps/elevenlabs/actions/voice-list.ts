import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";
import { voiceCategoryOptions, voiceSortOptions, voiceTypeOptions } from "../lib/params.ts";
import { sortDirectionOptions } from "../lib/params.ts";

/**
 * `GET /v2/voices` — the voices this connection can speak with.
 *
 * ## v2, not v1, and the reason is not just "newer"
 *
 * `GET /v1/voices` still exists and returns every voice in one unpaginated
 * response. It is also **public**: measured on 2026-08-11 it answers `200` with
 * 102,976 bytes of the default catalogue to a request carrying no credential at
 * all. `GET /v2/voices` requires a credential (`401` without one), pages, and
 * filters — so it is both the correct list for "what can *this account* use" and
 * the one that cannot silently succeed for a broken Connection.
 *
 * (That public v1 endpoint is also why the health probe is not a voice read.
 * See `auth/api-key.ts`.)
 *
 * ## Pagination is token-based, and `has_more` is the flag to trust
 *
 * The response carries `has_more`, `total_count` and `next_page_token`. The
 * vendor's own note says to page on `has_more` + `next_page_token` rather than
 * on the returned count — and separately warns that `total_count` "is a live
 * snapshot that reflects the current state of the database and may change
 * between requests". Counting your way to the end is how a paging loop silently
 * truncates.
 *
 * `page_size` caps at 100 and defaults to 10; the vendor notes the first page
 * may return more than asked, because the default voices are added to it.
 */
interface Input {
  search?: string;
  voiceType?: string;
  category?: string;
  pageSize?: number;
  nextPageToken?: string;
  sort?: string;
  sortDirection?: string;
  language?: string;
  includeTotalCount?: boolean;
}

const voiceList: ActionDefinition<Input> = {
  key: "voice-list",
  type: "read",
  resource: "voice",
  title: "List Voices",
  description: "List the voices available to this account, with search, filters and paging.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches name, description, labels and category.",
    },
    {
      key: "voiceType",
      label: "Voice type",
      type: "select",
      options: voiceTypeOptions,
      hint: "Leave empty to return every type.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: voiceCategoryOptions,
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Maximum 100; the API's own default is 10. The first page may return more than asked " +
        "because the premade voices are added to it.",
    },
    {
      key: "nextPageToken",
      label: "Next page token",
      type: "string",
      hint:
        "Pass the `next_page_token` from the previous result. Page while `has_more` is true — " +
        "do not page by counting against `total_count`, which is a live snapshot.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: voiceSortOptions,
      hint: "`created_at_unix` may be absent on older voices.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: sortDirectionOptions,
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      advanced: true,
      hint: "Filters on the voice's `language` label.",
    },
    {
      key: "includeTotalCount",
      label: "Include total count",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "On by default, matching the API. Turning it off is cheaper on large catalogues.",
    },
  ],
  output: [
    { key: "voices", type: "array", label: "The voices matching the query" },
    { key: "has_more", type: "boolean", label: "Whether another page exists" },
    { key: "total_count", type: "number", label: "Live snapshot of the total match count" },
    { key: "next_page_token", type: "string", label: "Token for the next page, null on the last" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json("/v2/voices", {
      query: {
        search: input.search,
        voice_type: input.voiceType,
        category: input.category,
        page_size: input.pageSize,
        next_page_token: input.nextPageToken,
        sort: input.sort,
        sort_direction: input.sortDirection,
        language: input.language,
        include_total_count: input.includeTotalCount === false ? "false" : undefined,
      },
    });
  },
};

export default voiceList;
