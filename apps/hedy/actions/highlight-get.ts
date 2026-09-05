import type { ActionDefinition } from "@w6w/types";
import { HedyClient } from "../lib/client.ts";

/**
 * `GET /highlights/{highlightId}` — full detail for one highlight.
 *
 * Per the `HighlightDetail` schema this is the only place `rawQuote` (the
 * unedited transcript excerpt), `timeIndex` (milliseconds from session start)
 * and `aiInsight` (the model's own note on why the moment matters) are
 * returned — `highlights-list` carries only the cleaned quote and a summary.
 */
interface Input {
  highlightId: string;
}

const highlightGet: ActionDefinition<Input> = {
  key: "highlight-get",
  type: "read",
  resource: "highlight",
  title: "Get Highlight",
  description: "Fetch full detail for one AI-extracted highlight.",
  params: [
    {
      key: "highlightId",
      label: "Highlight ID",
      type: "string",
      required: true,
      hint: "e.g. high_123456789 — from highlights-list's `id` field.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Highlight ID" },
    { key: "sessionId", type: "string", label: "Session this highlight belongs to" },
    { key: "timestamp", type: "string", label: "Wall-clock time (ISO 8601)" },
    { key: "timeIndex", type: "number", label: "Timestamp in milliseconds from session start" },
    { key: "rawQuote", type: "string", label: "Unedited transcript excerpt" },
    { key: "cleanedQuote", type: "string", label: "Cleaned-up quote" },
    { key: "aiInsight", type: "string", label: "Model's note on why this moment matters" },
    { key: "summary", type: "string", label: "One-line summary" },
    { key: "createdAt", type: "string", label: "When the highlight was created (ISO 8601)" },
  ],

  async execute(input, ctx) {
    const { data } = await new HedyClient(ctx).get(
      `/highlights/${encodeURIComponent(input.highlightId)}`,
    );
    return data;
  },
};

export default highlightGet;
