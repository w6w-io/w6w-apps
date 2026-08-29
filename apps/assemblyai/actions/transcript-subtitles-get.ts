import type { ActionDefinition } from "@w6w/types";
import { AssemblyAiClient } from "../lib/client.ts";
import { regionParam, transcriptIdParam } from "../lib/params.ts";

/**
 * `GET /v2/transcript/{id}/{subtitle_format}` — export the transcript as SRT or VTT
 * subtitles/captions.
 *
 * The ONLY endpoint in this app whose response is `text/plain`, not JSON — AssemblyAI's
 * OpenAPI document declares the `200` body as `text/plain` (and `text/html`) content,
 * unlike every other path here. {@link AssemblyAiClient.text} is used instead of `.json()`.
 */
interface Input {
  transcriptId: string;
  subtitleFormat: string;
  charsPerCaption?: number;
  region?: string;
}

const transcriptSubtitlesGet: ActionDefinition<Input> = {
  key: "transcript-subtitles-get",
  type: "read",
  resource: "transcript",
  title: "Get Transcript Subtitles",
  description: "Export the transcript as SRT or VTT subtitles/captions.",
  params: [
    transcriptIdParam,
    {
      key: "subtitleFormat",
      label: "Format",
      type: "select",
      required: true,
      default: "srt",
      options: [
        { value: "srt", label: "SRT" },
        { value: "vtt", label: "VTT" },
      ],
    },
    {
      key: "charsPerCaption",
      label: "Characters per caption",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Maximum number of characters per caption line.",
    },
    regionParam,
  ],
  output: [{ key: "subtitles", type: "string", label: "The exported SRT/VTT document" }],

  async execute(input, ctx) {
    const subtitles = await new AssemblyAiClient(ctx).text(
      `/transcript/${encodeURIComponent(input.transcriptId)}/${
        encodeURIComponent(input.subtitleFormat)
      }`,
      { region: input.region, query: { chars_per_caption: input.charsPerCaption } },
    );
    return { subtitles };
  },
};

export default transcriptSubtitlesGet;
