import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `GET /media/{media_id}` — "Get transcript". Returns the media's transcript
 * as plain text plus a word-level `transcription_data` array, along with the
 * transcode/transcribe status and thumbnails. `media_id` is the id embedded
 * in a question or answer's own `media_id` field, not the question/answer id
 * itself.
 */
interface Input {
  mediaId: string;
  organizationId?: string;
}

const mediaGet: ActionDefinition<Input> = {
  key: "media-get",
  type: "read",
  resource: "media",
  title: "Get Media Transcript",
  description: "Read a video/audio's transcript and transcode/transcribe status.",
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    organizationIdParam,
  ],
  output: [
    { key: "media_id", type: "string", label: "Media ID" },
    { key: "transcode_status", type: "string", label: "Transcode status" },
    { key: "transcribe_status", type: "string", label: "Transcribe status" },
    { key: "transcription", type: "string", label: "Transcript, plain text" },
    { key: "transcription_data", type: "array", label: "Word-level transcript data" },
    { key: "caption_data", type: "string", label: "WebVTT captions, if edited" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).entity(`/media/${encodeId(input.mediaId)}`, {
      organizationId: input.organizationId,
    });
  },
};

export default mediaGet;
