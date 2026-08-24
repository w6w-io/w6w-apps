import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import { recordingIdParam } from "../lib/params.ts";

interface Input {
  recordingId: string;
  format?: string;
}

interface Output {
  content: string;
  format: string;
}

const FORMATS = ["txt", "vtt", "srt"] as const;

/**
 * `GET /_/public-api/v2/recordings/:recording_id/transcript.{txt,vtt,srt}` —
 * three separate documented endpoints (a different file extension per
 * format), collapsed here into one action with a `format` param, since they
 * differ only in the path suffix and all answer with a plain-text body
 * (speaker-labelled text, WebVTT or SubRip respectively).
 */
const recordingTranscriptDownload: ActionDefinition<Input, Output> = {
  key: "recording-transcript-download",
  type: "read",
  resource: "recording",
  title: "Get Recording Transcript (text format)",
  description: "Fetch a recording's transcript as plain text, WebVTT (.vtt) or SubRip (.srt).",
  params: [
    recordingIdParam,
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "txt",
      options: [
        { value: "txt", label: "Plain text (speaker: text per line)" },
        { value: "vtt", label: "WebVTT" },
        { value: "srt", label: "SubRip" },
      ],
    },
  ],
  output: [
    { key: "content", type: "string", label: "Transcript file contents" },
    { key: "format", type: "string", label: "Format returned (txt, vtt or srt)" },
  ],

  async execute(input, ctx) {
    const format = FORMATS.includes(input.format as typeof FORMATS[number])
      ? (input.format as string)
      : "txt";
    const res = await new GrainClient(ctx).send(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/transcript.${format}`,
      { headers: { accept: "text/plain" } },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Grain ${res.status} for GET transcript.${format}: ${
          text ? text.slice(0, 200) : res.statusText
        }`,
      );
    }
    return { content: await res.text(), format };
  },
};

export default recordingTranscriptDownload;
