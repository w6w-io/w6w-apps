import type { ActionDefinition } from "@w6w/types";
import {
  ANALYTICS_FIELDS,
  FirefliesClient,
  MEDIA_FIELDS,
  SENTENCE_FIELDS,
  SUMMARY_FIELDS,
  TRANSCRIPT_DETAIL,
} from "../lib/client.ts";

interface Input {
  transcriptId: string;
  includeSummary?: boolean;
  includeSentences?: boolean;
  includeMediaUrls?: boolean;
  includeAnalytics?: boolean;
}

/**
 * The selection set is assembled per call rather than fixed, because three of
 * the four optional groups are gated behind a paid plan (`schema/transcript`:
 * `audio_url`, `video_url` and `analytics` each say "You need to be subscribed
 * to a Pro or higher plan"). Asking for them unconditionally would make this
 * read fail outright for every Free-plan connection, so they are opt-in.
 * `sentences` is opt-in for a different reason: a one-hour meeting is thousands
 * of rows, and most workflows want the summary.
 */
function buildQuery(input: Input): string {
  const parts = [TRANSCRIPT_DETAIL];
  if (input.includeSummary !== false) parts.push(SUMMARY_FIELDS);
  if (input.includeSentences) parts.push(SENTENCE_FIELDS);
  if (input.includeMediaUrls) parts.push(MEDIA_FIELDS);
  if (input.includeAnalytics) parts.push(ANALYTICS_FIELDS);
  return `
    query Transcript($transcriptId: String!) {
      transcript(id: $transcriptId) {
        ${parts.join("\n")}
      }
    }
  `;
}

const transcriptGet: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description: "Fetch one meeting transcript by id, with optional summary, sentences and media.",
  params: [
    {
      key: "transcriptId",
      label: "Transcript ID",
      type: "string",
      required: true,
      hint: "The meeting/transcript id. `transcript-search` lists them.",
    },
    {
      key: "includeSummary",
      label: "Include AI summary",
      type: "boolean",
      default: true,
      hint: "Gist, overview, action items, keywords, chapters.",
    },
    {
      key: "includeSentences",
      label: "Include sentences",
      type: "boolean",
      default: false,
      hint:
        "The full utterance-by-utterance transcript. Large — a one-hour meeting is thousands of rows.",
    },
    {
      key: "includeMediaUrls",
      label: "Include audio/video URLs",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Pro plan or higher. The URLs are freshly signed and expire after 24 hours. Requesting these on a Free plan fails the whole query.",
    },
    {
      key: "includeAnalytics",
      label: "Include analytics",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Pro plan or higher. Sentiment, per-speaker talk time, filler words.",
    },
  ],
  output: [
    { key: "transcript.id", type: "string", label: "Transcript ID" },
    { key: "transcript.title", type: "string", label: "Title" },
    { key: "transcript.dateString", type: "string", label: "Date (ISO 8601)" },
    { key: "transcript.duration", type: "number", label: "Duration (minutes)" },
    { key: "transcript.transcript_url", type: "string", label: "Dashboard URL" },
    { key: "transcript.summary", type: "object", label: "AI summary" },
    { key: "transcript.sentences", type: "array", label: "Sentences" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input), {
      transcriptId: input.transcriptId,
    });
  },
};

export default transcriptGet;
