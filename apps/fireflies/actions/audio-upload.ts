import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient } from "../lib/client.ts";

interface Input {
  url: string;
  title?: string;
  customLanguage?: string;
  saveVideo?: boolean;
  clientReferenceId?: string;
  webhook?: string;
  attendeeEmails?: string;
  bypassSizeCheck?: boolean;
}

const MUTATION = `
  mutation UploadAudio($input: AudioUploadInput) {
    uploadAudio(input: $input) {
      success
      title
      message
    }
  }
`;

const audioUpload: ActionDefinition<Input> = {
  key: "audio-upload",
  type: "perform",
  resource: "transcript",
  title: "Upload Audio",
  description: "Send a publicly downloadable audio or video URL to Fireflies for transcription.",
  // Fireflies mints a new transcript per call; `client_reference_id` is an echo
  // field for correlating webhooks, NOT a dedupe key, so a retry transcribes
  // the same file twice.
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Media URL",
      type: "string",
      required: true,
      hint:
        "Direct https link to an mp3, mp4, wav, m4a or ogg. Must be publicly downloadable — a preview/share page will not work.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { maxLength: 256 },
      hint: "Defaults to the file's own name.",
    },
    {
      key: "customLanguage",
      label: "Language code",
      type: "string",
      hint:
        "e.g. `es`, `de`. Defaults to English. An unsupported code fails with `invalid_language_code`.",
    },
    { key: "saveVideo", label: "Save video", type: "boolean", row: "opts" },
    {
      key: "attendeeEmails",
      label: "Attendee emails",
      type: "string",
      hint:
        "Comma-separated. Used to route the meeting notes to a connected CRM. Max 100 attendees.",
    },
    {
      key: "clientReferenceId",
      label: "Client reference ID",
      type: "string",
      advanced: true,
      validation: { maxLength: 128 },
      hint: "Your own identifier, echoed back on the webhook event. Not a de-duplication key.",
    },
    {
      key: "webhook",
      label: "Webhook URL",
      type: "string",
      advanced: true,
      hint: "Notified when transcription finishes.",
    },
    {
      key: "bypassSizeCheck",
      label: "Allow files under 50 KB",
      type: "boolean",
      advanced: true,
      hint: "Without this, anything smaller is rejected with `payload_too_small`.",
    },
  ],
  output: [
    { key: "uploadAudio.success", type: "boolean", label: "Accepted" },
    { key: "uploadAudio.title", type: "string", label: "Title" },
    { key: "uploadAudio.message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    ctx.log("info", "uploading media to Fireflies", { title: input.title });
    // `download_auth` (a bearer/basic credential for a private media host) is
    // deliberately not exposed: a third-party credential does not belong in
    // Action params, where it would be stored with the workflow. Use a
    // pre-signed URL instead.
    return new FirefliesClient(ctx).query(MUTATION, {
      input: {
        url: input.url,
        title: input.title || undefined,
        custom_language: input.customLanguage || undefined,
        save_video: input.saveVideo,
        client_reference_id: input.clientReferenceId || undefined,
        webhook: input.webhook || undefined,
        bypass_size_check: input.bypassSizeCheck,
        attendees: csv(input.attendeeEmails)?.map((email) => ({ email })),
      },
    });
  },
};

export default audioUpload;
