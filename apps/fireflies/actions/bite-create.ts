import type { ActionDefinition } from "@w6w/types";
import { BITE_FIELDS, csv, FirefliesClient } from "../lib/client.ts";

interface Input {
  transcriptId: string;
  startTime: number;
  endTime: number;
  name?: string;
  summary?: string;
  mediaType?: string;
  privacies?: string;
}

/**
 * `start_time` / `end_time` are `Float!` and are passed as variables, not
 * inlined: a clip boundary is legitimately fractional (12.5 seconds), so unlike
 * the pagination arguments these must not be forced to integers.
 */
const MUTATION = `
  mutation CreateBite(
    $transcriptId: ID!
    $startTime: Float!
    $endTime: Float!
    $name: String
    $summary: String
    $mediaType: String
    $privacies: [String]
  ) {
    createBite(
      transcript_id: $transcriptId
      start_time: $startTime
      end_time: $endTime
      name: $name
      summary: $summary
      media_type: $mediaType
      privacies: $privacies
    ) {
      ${BITE_FIELDS}
    }
  }
`;

const biteCreate: ActionDefinition<Input> = {
  key: "bite-create",
  type: "perform",
  resource: "bite",
  title: "Create Soundbite",
  description: "Clip a segment of a meeting into a shareable soundbite.",
  // Every call mints a new soundbite id; there is no client-supplied key.
  idempotent: false,
  params: [
    { key: "transcriptId", label: "Transcript ID", type: "string", required: true },
    {
      key: "startTime",
      label: "Start (seconds)",
      type: "number",
      required: true,
      row: "range",
      hint: "Offset from the start of the meeting. Fractional seconds are allowed.",
    },
    { key: "endTime", label: "End (seconds)", type: "number", required: true, row: "range" },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 256 } },
    {
      key: "summary",
      label: "Summary",
      type: "text",
      validation: { maxLength: 500 },
    },
    {
      key: "mediaType",
      label: "Media type",
      type: "select",
      options: [
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
      ],
    },
    {
      key: "privacies",
      label: "Visibility",
      type: "string",
      advanced: true,
      hint: "Comma-separated, from `public`, `team`, `participants`.",
    },
  ],
  output: [
    { key: "createBite.id", type: "string", label: "Soundbite ID" },
    { key: "createBite.name", type: "string", label: "Name" },
    { key: "createBite.status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      transcriptId: input.transcriptId,
      startTime: input.startTime,
      endTime: input.endTime,
      name: input.name,
      summary: input.summary,
      mediaType: input.mediaType,
      privacies: csv(input.privacies),
    });
  },
};

export default biteCreate;
