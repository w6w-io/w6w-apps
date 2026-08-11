import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";
import { historySourceOptions, sortDirectionOptions } from "../lib/params.ts";

/**
 * `GET /v1/history` — the generations this account has made.
 *
 * ## Cursor paging, and the cursor is an item id
 *
 * Paging is `start_after_history_item_id`: take `last_history_item_id` from the
 * previous response and pass it here. `has_more` says whether to keep going.
 * There is no page number and no offset.
 *
 * ## What is NOT in here
 *
 * Anything generated with `enable_logging=false` (zero-retention mode) never
 * enters history at all, so an empty result does not mean nothing was
 * generated. `scanned_until` is the vendor's own hint about how far back the
 * scan reached, which matters when filtering by date over a large history.
 *
 * `page_size` caps at 1,000 and the API's default is 100; this action prefills
 * 50, because a workflow step that silently returns a thousand records is a
 * footgun rather than a convenience. Raise it explicitly when you mean to.
 */
interface Input {
  pageSize?: number;
  startAfterHistoryItemId?: string;
  voiceId?: string;
  modelId?: string;
  source?: string;
  search?: string;
  dateAfterUnix?: number;
  dateBeforeUnix?: number;
  sortDirection?: string;
}

const historyList: ActionDefinition<Input> = {
  key: "history-list",
  type: "read",
  resource: "history",
  title: "List Generation History",
  description: "List past generations, filtered by voice, model, source, text or date.",
  params: [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum 1,000; the API's own default is 100. Prefilled small on purpose.",
    },
    {
      key: "startAfterHistoryItemId",
      label: "Start after item ID",
      type: "string",
      hint: "Pass `last_history_item_id` from the previous result to fetch the next page. Keep " +
        "going while `has_more` is true.",
    },
    {
      key: "voiceId",
      label: "Voice ID",
      type: "string",
      hint: "Only generations made with this voice.",
    },
    { key: "modelId", label: "Model ID", type: "string", advanced: true },
    {
      key: "source",
      label: "Source",
      type: "select",
      advanced: true,
      options: historySourceOptions,
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      advanced: true,
      hint: "Free-text filter over the generated text.",
    },
    {
      key: "dateAfterUnix",
      label: "Generated after (Unix seconds)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Inclusive.",
    },
    {
      key: "dateBeforeUnix",
      label: "Generated before (Unix seconds)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Exclusive.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: sortDirectionOptions,
    },
  ],
  output: [
    { key: "history", type: "array", label: "The history items" },
    { key: "has_more", type: "boolean", label: "Whether another page exists" },
    { key: "last_history_item_id", type: "string", label: "Cursor for the next page" },
    { key: "scanned_until", type: "number", label: "How far back the scan reached" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json("/v1/history", {
      query: {
        page_size: input.pageSize,
        start_after_history_item_id: input.startAfterHistoryItemId,
        voice_id: input.voiceId,
        model_id: input.modelId,
        source: input.source,
        search: input.search,
        date_after_unix: input.dateAfterUnix,
        date_before_unix: input.dateBeforeUnix,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default historyList;
