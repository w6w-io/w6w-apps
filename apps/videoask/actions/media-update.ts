import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `PATCH /media/{media_id}` — "Edit captions". Body: `{"caption_data": "..."}`
 * where the value is a WebVTT document (`WEBVTT\n\n<cue>...`), confirmed
 * against the vendor's own example.
 */
interface Input {
  mediaId: string;
  captionData: string;
  organizationId?: string;
}

const mediaUpdate: ActionDefinition<Input> = {
  key: "media-update",
  type: "perform",
  resource: "media",
  title: "Edit Captions",
  description: "Replace a video/audio's captions with a WebVTT document.",
  idempotent: true,
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    {
      key: "captionData",
      label: "Caption data (WebVTT)",
      type: "text",
      required: true,
      hint:
        'A full WebVTT document, e.g. "WEBVTT\\n\\nkey-0\\n00:00:00.700 --> 00:00:02.000\\nHello".',
    },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The updated media" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(`/media/${encodeId(input.mediaId)}`, {
      method: "PATCH",
      body: { caption_data: input.captionData },
      organizationId: input.organizationId,
    });
    return { result };
  },
};

export default mediaUpdate;
