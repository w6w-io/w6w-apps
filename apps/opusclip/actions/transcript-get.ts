import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `GET /api/transcripts?q=findByProjectId` — a project's trimmed source-video
 * transcript.
 *
 * `q` is required but `findByProjectId` is documented as the only value a
 * public caller may pass, so it is hard-coded.
 *
 * The response wraps a single, possibly-`null` transcript inside an array
 * (`data[0]`) — this action unwraps that for a cleaner output shape: `null`
 * when the project has no transcript yet (e.g. still processing), otherwise
 * the array of paragraphs.
 */
interface Input {
  projectId: string;
}

interface TranscriptWireResponse {
  data?: Array<unknown[] | null>;
}

const transcriptGet: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript",
  description: "Get a project's trimmed source-video transcript (paragraphs with word-level " +
    "timings). Returns null if the project has no transcript yet.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [{ key: "paragraphs", type: "array", label: "Transcript paragraphs, or null" }],

  async execute(input, ctx) {
    const body = await new OpusClipClient(ctx).json<TranscriptWireResponse>("/api/transcripts", {
      query: { q: "findByProjectId", projectId: input.projectId },
    });
    return { paragraphs: body?.data?.[0] ?? null };
  },
};

export default transcriptGet;
