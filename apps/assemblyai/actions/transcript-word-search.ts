import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient, toArray } from "../lib/client.ts";
import { regionParam, transcriptIdParam } from "../lib/params.ts";

/**
 * `GET /v2/transcript/{id}/word-search` — search the transcript for keywords or short
 * phrases (up to five words/numbers each) and get back timestamps and match counts.
 *
 * The `words` query parameter is comma-joined, not repeated (`style: form, explode: false`
 * in AssemblyAI's OpenAPI document) — {@link toArray} normalizes the `multiselect`-shaped
 * input the same way `lib/client.ts` does for other apps in this pack, then this action
 * joins it with a comma itself before it reaches the query string.
 */
interface Input {
  transcriptId: string;
  words: string[] | string;
  region?: string;
}

const transcriptWordSearch: ActionDefinition<Input> = {
  key: "transcript-word-search",
  type: "search",
  resource: "transcript",
  title: "Search Transcript Words",
  description: "Search the transcript for keywords or short phrases and get back match " +
    "counts and timestamps.",
  params: [
    transcriptIdParam,
    {
      key: "words",
      label: "Words",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "One or more words, numbers, or short phrases (up to 5 words/numbers each) to " +
        "search for.",
    },
    regionParam,
  ],
  output: [
    { key: "id", type: "string", label: "Transcript ID" },
    { key: "total_count", type: "number", label: "Total count of all matched instances" },
    { key: "matches", type: "array", label: "Matches, each with text/count/timestamps/indexes" },
  ],

  execute(input, ctx) {
    const words = toArray(input.words).join(",");
    return new AssemblyAiClient(ctx).json(
      `/transcript/${encodeURIComponent(input.transcriptId)}/word-search`,
      { region: input.region, query: { words } },
    );
  },
};

export default transcriptWordSearch;
