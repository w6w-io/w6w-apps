import type { ActionDefinition } from "@w6w/types";
import { compact, HeyGenClient, toList } from "../lib/client.ts";

interface Input {
  videoUrl?: string;
  videoAssetId?: string;
  outputLanguages: string | string[];
  audioUrl?: string;
  audioAssetId?: string;
  title?: string;
  inputLanguage?: string;
  translateAudioOnly?: boolean;
  speakerNum?: number;
  mode?: "speed" | "precision";
  callbackUrl?: string;
}

/**
 * `POST /v3/video-translations` — translate a video into one or more target languages with voice
 * cloning and lip-sync. Target language values must be the exact strings HeyGen's
 * `video-translation-languages-list` action returns (e.g. `"Spanish (Spain)"`), not ISO codes.
 *
 * Async, and one caveat that is easy to miss: the response is `video_translation_ids` — PLURAL,
 * one job id per target language, even for a single-language request. There is no single
 * `video_translation_id` singular field to fall back to.
 */
const videoTranslationCreate: ActionDefinition<Input> = {
  key: "video-translation-create",
  type: "perform",
  resource: "video-translation",
  title: "Create Video Translation",
  description:
    "Translate a video into one or more target languages, with voice cloning and lip-sync. " +
    "Returns one job ID per target language — poll each with Get Video Translation.",
  idempotent: false,
  params: [
    {
      key: "videoUrl",
      label: "Source video URL",
      type: "string",
      hint: "Publicly accessible URL of the source video. Mutually exclusive with videoAssetId.",
    },
    {
      key: "videoAssetId",
      label: "Source video asset ID",
      type: "string",
      hint: "A HeyGen asset ID (from Upload Asset). Mutually exclusive with videoUrl.",
    },
    {
      key: "outputLanguages",
      label: "Target languages",
      type: "string",
      required: true,
      hint: "Comma-separated exact language names from List Supported Translation Languages " +
        '(e.g. "Spanish (Spain), French"). One job is created per language.',
    },
    {
      key: "audioUrl",
      label: "Custom dubbing audio URL",
      type: "string",
      hint: "Optional — dub with this audio instead of translating the source track.",
    },
    { key: "audioAssetId", label: "Custom dubbing audio asset ID", type: "string" },
    { key: "title", label: "Title", type: "string" },
    {
      key: "inputLanguage",
      label: "Source language",
      type: "string",
      hint: "Auto-detected when omitted.",
    },
    {
      key: "translateAudioOnly",
      label: "Translate audio only",
      type: "boolean",
      default: false,
      hint: "Keep the original video, only replace the audio track.",
    },
    { key: "speakerNum", label: "Number of speakers", type: "number" },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "speed",
      options: [
        { value: "speed", label: "Speed (faster)" },
        { value: "precision", label: "Precision (higher lip-sync quality)" },
      ],
    },
    { key: "callbackUrl", label: "Webhook callback URL", type: "string" },
  ],
  output: [{
    key: "video_translation_ids",
    type: "array",
    label: "One job ID per target language",
  }],

  async execute(input, ctx) {
    const hasVideoUrl = !!input.videoUrl;
    const hasVideoAsset = !!input.videoAssetId;
    if (hasVideoUrl === hasVideoAsset) {
      throw new Error(
        "video-translation-create requires exactly one of `videoUrl` or `videoAssetId`",
      );
    }
    if (input.audioUrl && input.audioAssetId) {
      throw new Error(
        "video-translation-create: pass only one of `audioUrl` or `audioAssetId`, not both",
      );
    }

    const outputLanguages = toList(input.outputLanguages);
    if (!outputLanguages || outputLanguages.length === 0) {
      throw new Error("video-translation-create requires at least one `outputLanguages` entry");
    }

    const video = input.videoUrl
      ? { type: "url", url: input.videoUrl }
      : { type: "asset_id", asset_id: input.videoAssetId };
    const audio = input.audioUrl
      ? { type: "url", url: input.audioUrl }
      : input.audioAssetId
      ? { type: "asset_id", asset_id: input.audioAssetId }
      : undefined;

    const client = new HeyGenClient(ctx);
    return await client.data("/v3/video-translations", {
      method: "POST",
      body: compact({
        video,
        output_languages: outputLanguages,
        audio,
        title: input.title,
        input_language: input.inputLanguage,
        translate_audio_only: input.translateAudioOnly,
        speaker_num: input.speakerNum,
        mode: input.mode,
        callback_url: input.callbackUrl,
      }),
    });
  },
};

export default videoTranslationCreate;
