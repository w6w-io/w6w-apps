import type { ActionDefinition } from "@w6w/types";
import { compact, HeyGenClient } from "../lib/client.ts";

interface Input {
  avatarId: string;
  script?: string;
  voiceId?: string;
  audioUrl?: string;
  audioAssetId?: string;
  title?: string;
  folderId?: string;
  resolution?: "4k" | "1080p" | "720p";
  aspectRatio?: "16:9" | "9:16" | "4:5" | "5:4" | "1:1" | "auto";
  removeBackground?: boolean;
  outputFormat?: "mp4" | "webm";
  callbackUrl?: string;
  callbackId?: string;
}

/**
 * `POST /v3/videos` with `type: "avatar"` — the classic "avatar speaks a script" video, HeyGen's
 * flagship generation path. Async: this returns a `video_id` in an initial `status` (typically
 * `"waiting"`); poll it with `video-get`, or supply `callbackUrl` for a webhook instead.
 *
 * The full `CreateVideoV3RequestBody` is a four-way discriminated union (`avatar` | `image` |
 * `cinematic_avatar` | `studio`) covering photo/video animation, camera-directed cinematic shots
 * and multi-scene studio composition. Only `avatar` — speaking a script or dubbing supplied audio
 * onto a HeyGen avatar look — is exposed here; the other three types and the advanced `engine`/
 * `background`/`caption`/`watermark`/`motion_prompt` fields on this one are left out rather than
 * guessed at. See `docs/create-video-agent-session` and `docs/cinematic-avatar` in HeyGen's own
 * docs for those paths if they are ever added.
 */
const videoCreate: ActionDefinition<Input> = {
  key: "video-create",
  type: "perform",
  resource: "video",
  title: "Create Avatar Video",
  description:
    "Generate a video of a HeyGen avatar speaking a script (or lip-synced to supplied audio). " +
    "Returns immediately with a video_id in a pending status — poll Get Video, or pass a " +
    "callbackUrl, for the finished result.",
  idempotent: false,
  params: [
    {
      key: "avatarId",
      label: "Avatar ID",
      type: "string",
      required: true,
      hint: "A video avatar or photo avatar look ID (list-avatar-looks' 'id' field).",
    },
    {
      key: "script",
      label: "Script",
      type: "text",
      hint: "Text for the avatar to speak (max 5,000 characters). Mutually exclusive with " +
        "audioUrl/audioAssetId. Pair with voiceId, or omit it to use the avatar's default voice.",
    },
    { key: "voiceId", label: "Voice ID", type: "string" },
    {
      key: "audioUrl",
      label: "Audio URL",
      type: "string",
      hint: "Publicly accessible URL of audio to lip-sync. Mutually exclusive with script.",
    },
    {
      key: "audioAssetId",
      label: "Audio asset ID",
      type: "string",
      hint: "A HeyGen asset ID (from Upload Asset) to lip-sync. Mutually exclusive with script.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "folderId", label: "Folder ID", type: "string" },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      options: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
        { value: "4k", label: "4K" },
      ],
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      type: "select",
      default: "16:9",
      options: [
        { value: "16:9", label: "16:9 (landscape)" },
        { value: "9:16", label: "9:16 (portrait)" },
        { value: "4:5", label: "4:5" },
        { value: "5:4", label: "5:4" },
        { value: "1:1", label: "1:1 (square)" },
        { value: "auto", label: "Auto (match source)" },
      ],
    },
    {
      key: "removeBackground",
      label: "Remove background",
      type: "boolean",
      hint: "The avatar must be a video avatar trained with matting enabled.",
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      default: "mp4",
      options: [
        { value: "mp4", label: "mp4" },
        { value: "webm", label: "webm (transparent background)" },
      ],
    },
    {
      key: "callbackUrl",
      label: "Webhook callback URL",
      type: "string",
      hint: "Called with the result when the video finishes, instead of polling Get Video.",
    },
    { key: "callbackId", label: "Callback ID", type: "string" },
  ],
  output: [
    { key: "video_id", type: "string", label: "Video ID" },
    { key: "status", type: "string", label: "Initial status" },
    { key: "output_format", type: "string", label: "Resolved output format" },
  ],

  async execute(input, ctx) {
    const hasScript = !!input.script;
    const hasAudio = !!input.audioUrl || !!input.audioAssetId;
    if (hasScript === hasAudio) {
      throw new Error(
        "video-create requires exactly one of `script` or an audio source " +
          "(`audioUrl`/`audioAssetId`)",
      );
    }
    if (input.audioUrl && input.audioAssetId) {
      throw new Error("video-create: pass only one of `audioUrl` or `audioAssetId`, not both");
    }

    const client = new HeyGenClient(ctx);
    return await client.data("/v3/videos", {
      method: "POST",
      body: compact({
        type: "avatar",
        avatar_id: input.avatarId,
        script: input.script,
        voice_id: input.voiceId,
        audio_url: input.audioUrl,
        audio_asset_id: input.audioAssetId,
        title: input.title,
        folder_id: input.folderId,
        resolution: input.resolution,
        aspect_ratio: input.aspectRatio,
        remove_background: input.removeBackground,
        output_format: input.outputFormat,
        callback_url: input.callbackUrl,
        callback_id: input.callbackId,
      }),
    });
  },
};

export default videoCreate;
