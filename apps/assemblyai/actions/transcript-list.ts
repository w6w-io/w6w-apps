import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptStatusOptions } from "../lib/params.ts";

/**
 * `GET /v2/transcript` — list the transcripts on this account, newest first.
 *
 * Pagination is cursor-based on transcript ID (`before_id`/`after_id`), not offset/page —
 * per AssemblyAI's own docs, results are only retrievable for the last 90 days.
 */
interface Input {
  limit?: number;
  status?: string;
  createdOn?: string;
  beforeId?: string;
  afterId?: string;
  region?: string;
}

const transcriptList: ActionDefinition<Input> = {
  key: "transcript-list",
  type: "search",
  resource: "transcript",
  title: "List Transcripts",
  description: "List transcripts on this account, newest first. Retrievable for the last " +
    "90 days only.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 200 },
      hint: "Maximum number of transcripts to retrieve (1-200). Defaults to 10.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: transcriptStatusOptions,
      hint: "Only transcripts with this status.",
    },
    {
      key: "createdOn",
      label: "Created on",
      type: "date",
      advanced: true,
      hint: "Only transcripts created on this date (YYYY-MM-DD).",
    },
    {
      key: "beforeId",
      label: "Before ID",
      type: "string",
      advanced: true,
      hint: "Get transcripts created before this transcript ID (for paging backward, to " +
        "older transcripts).",
    },
    {
      key: "afterId",
      label: "After ID",
      type: "string",
      advanced: true,
      hint: "Get transcripts created after this transcript ID (for paging forward, to newer " +
        "transcripts).",
    },
    regionParam,
  ],
  output: [
    {
      key: "page_details",
      type: "object",
      label: "Pagination metadata (limit, result_count, " +
        "current_url, prev_url, next_url)",
    },
    {
      key: "transcripts",
      type: "array",
      label: "Transcript summaries (id, status, created, " +
        "completed, audio_url, error)",
    },
  ],

  execute(input, ctx) {
    return new AssemblyAiClient(ctx).json("/transcript", {
      region: input.region,
      query: {
        limit: input.limit,
        status: input.status,
        created_on: input.createdOn,
        before_id: input.beforeId,
        after_id: input.afterId,
      },
    });
  },
};

export default transcriptList;
