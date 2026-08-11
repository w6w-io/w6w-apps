import type { Option, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the ElevenLabs actions.
 *
 * Every enum here is copied from ElevenLabs' OpenAPI 3.1 document (fetched
 * 2026-08-11 from `https://api.elevenlabs.io/openapi.json`) or, where the
 * document types a field as a free string, from that field's own `description`
 * in the same document — which is where this vendor keeps several of its
 * vocabularies. Each list below says which of the two it came from, because the
 * second kind is advisory: the API will accept a value the description does not
 * list.
 */

/**
 * `output_format`, straight from the query parameter's `enum`.
 *
 * The naming is `codec_samplerate_bitrate`, and two entries are plan-gated by
 * the vendor's own note: `mp3_44100_192` needs Creator tier or above, and the
 * 44.1 kHz PCM/WAV formats need Pro tier or above. Asking for one you are not
 * entitled to fails the request rather than downgrading it.
 *
 * This list is the TTS parameter's enum. Sound generation offers the same set
 * minus the `wav_*` family, which is why `sound-generation` declares its own.
 */
export const ttsOutputFormatOptions: Option[] = [
  { value: "mp3_44100_128", label: "MP3 44.1 kHz 128 kbps (default)" },
  { value: "mp3_44100_192", label: "MP3 44.1 kHz 192 kbps — Creator tier or above" },
  { value: "mp3_44100_96", label: "MP3 44.1 kHz 96 kbps" },
  { value: "mp3_44100_64", label: "MP3 44.1 kHz 64 kbps" },
  { value: "mp3_44100_32", label: "MP3 44.1 kHz 32 kbps" },
  { value: "mp3_24000_48", label: "MP3 24 kHz 48 kbps" },
  { value: "mp3_22050_32", label: "MP3 22.05 kHz 32 kbps" },
  { value: "opus_48000_192", label: "Opus 48 kHz 192 kbps" },
  { value: "opus_48000_128", label: "Opus 48 kHz 128 kbps" },
  { value: "opus_48000_96", label: "Opus 48 kHz 96 kbps" },
  { value: "opus_48000_64", label: "Opus 48 kHz 64 kbps" },
  { value: "opus_48000_32", label: "Opus 48 kHz 32 kbps" },
  { value: "pcm_48000", label: "PCM 48 kHz" },
  { value: "pcm_44100", label: "PCM 44.1 kHz — Pro tier or above" },
  { value: "pcm_32000", label: "PCM 32 kHz" },
  { value: "pcm_24000", label: "PCM 24 kHz" },
  { value: "pcm_22050", label: "PCM 22.05 kHz" },
  { value: "pcm_16000", label: "PCM 16 kHz" },
  { value: "pcm_8000", label: "PCM 8 kHz" },
  { value: "ulaw_8000", label: "μ-law 8 kHz — the Twilio input format" },
  { value: "alaw_8000", label: "A-law 8 kHz" },
  { value: "wav_48000", label: "WAV 48 kHz" },
  { value: "wav_44100", label: "WAV 44.1 kHz — Pro tier or above" },
  { value: "wav_32000", label: "WAV 32 kHz" },
  { value: "wav_24000", label: "WAV 24 kHz" },
  { value: "wav_22050", label: "WAV 22.05 kHz" },
  { value: "wav_16000", label: "WAV 16 kHz" },
  { value: "wav_8000", label: "WAV 8 kHz" },
];

/** `output_format` on `POST /v1/sound-generation` — the TTS set without WAV. */
export const sfxOutputFormatOptions: Option[] = ttsOutputFormatOptions.filter(
  (o) => !String(o.value).startsWith("wav_"),
);

/**
 * `apply_text_normalization` on the TTS bodies, from the property's `enum`.
 */
export const textNormalizationOptions: Option[] = [
  { value: "auto", label: "Auto — the system decides (default)" },
  { value: "on", label: "On — always normalize" },
  { value: "off", label: "Off — never normalize" },
];

/** `model_id` on `POST /v1/speech-to-text`, from the property's `enum`. */
export const sttModelOptions: Option[] = [
  { value: "scribe_v1", label: "Scribe v1" },
  { value: "scribe_v2", label: "Scribe v2" },
];

/** `timestamps_granularity` on speech-to-text, from the property's `enum`. */
export const timestampGranularityOptions: Option[] = [
  { value: "none", label: "None" },
  { value: "word", label: "Word (default)" },
  { value: "character", label: "Character — per character within each word" },
];

/** `source` on `GET /v1/history`, from the query parameter's `enum`. */
export const historySourceOptions: Option[] = [
  { value: "TTS", label: "Text to speech" },
  { value: "STS", label: "Speech to speech" },
  { value: "Flows", label: "Flows" },
];

/** `sort_direction`, from the `GET /v1/history` query parameter's `enum`. */
export const sortDirectionOptions: Option[] = [
  { value: "desc", label: "Newest first (default)" },
  { value: "asc", label: "Oldest first" },
];

/** `metric` on `GET /v1/usage/character-stats`, from the query parameter's `enum`. */
export const usageMetricOptions: Option[] = [
  { value: "credits", label: "Credits (default)" },
  { value: "tts_characters", label: "Text-to-speech characters" },
  { value: "minutes_used", label: "Minutes used" },
  { value: "request_count", label: "Request count" },
  { value: "ttfb_avg", label: "Time to first byte — average" },
  { value: "ttfb_p95", label: "Time to first byte — 95th percentile" },
  { value: "fiat_units_spent", label: "Currency spent" },
  { value: "concurrency", label: "Concurrency" },
  { value: "concurrency_average", label: "Concurrency — average" },
];

/** `breakdown_type` on `GET /v1/usage/character-stats`, from the parameter's `enum`. */
export const usageBreakdownOptions: Option[] = [
  { value: "none", label: "No breakdown (default)" },
  { value: "voice", label: "By voice" },
  { value: "voice_multiplier", label: "By voice multiplier" },
  { value: "user", label: "By user — workspace metrics must be included" },
  { value: "groups", label: "By group" },
  { value: "api_keys", label: "By API key" },
  { value: "all_api_keys", label: "By API key, including deleted keys" },
  { value: "product_type", label: "By product" },
  { value: "model", label: "By model" },
  { value: "resource", label: "By resource" },
  { value: "request_queue", label: "By request queue" },
  { value: "region", label: "By region" },
  { value: "subresource_id", label: "By subresource" },
  { value: "reporting_workspace_id", label: "By reporting workspace" },
  { value: "has_api_key", label: "By whether an API key was used" },
  { value: "request_source", label: "By request source" },
];

/** `aggregation_interval` on `GET /v1/usage/character-stats`, from the parameter's `enum`. */
export const usageIntervalOptions: Option[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day (default)" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "cumulative", label: "Cumulative — one running total" },
];

/**
 * `voice_type` on `GET /v2/voices`.
 *
 * The document types this parameter as a bare string; the values come from its
 * own `description`, which reads "One of 'personal', 'community', 'default',
 * 'workspace', 'non-default', 'non-community', 'saved'".
 */
export const voiceTypeOptions: Option[] = [
  { value: "personal", label: "Personal — voices you cloned or generated" },
  { value: "community", label: "Community — voices shared from the library" },
  { value: "default", label: "Default — the premade ElevenLabs voices" },
  { value: "workspace", label: "Workspace — shared with you by your workspace" },
  { value: "non-default", label: "Everything except the premade voices" },
  { value: "non-community", label: "Everything except community voices" },
  { value: "saved", label: "Saved" },
];

/**
 * `category` on `GET /v2/voices`. Free string in the document; values from its
 * `description` ("One of 'premade', 'cloned', 'generated', 'professional'").
 */
export const voiceCategoryOptions: Option[] = [
  { value: "premade", label: "Premade" },
  { value: "cloned", label: "Cloned" },
  { value: "generated", label: "Generated" },
  { value: "professional", label: "Professional" },
];

/**
 * `sort` on `GET /v2/voices`. Free string; values from its `description`
 * ("one of 'created_at_unix' or 'name'").
 */
export const voiceSortOptions: Option[] = [
  { value: "created_at_unix", label: "Created — may be absent on older voices" },
  { value: "name", label: "Name" },
];

/** `category` on `GET /v1/shared-voices`, from the query parameter's `enum`. */
export const libraryCategoryOptions: Option[] = [
  { value: "professional", label: "Professional" },
  { value: "famous", label: "Famous" },
  { value: "high_quality", label: "High quality" },
];

/** `sort` on `GET /v1/shared-voices`, from the query parameter's `enum`. */
export const librarySortOptions: Option[] = [
  { value: "created_date", label: "Created date (default)" },
  { value: "usage_character_count_1y", label: "Characters used in the last year" },
  { value: "trending", label: "Trending" },
  { value: "cloned_by_count", label: "Times cloned" },
];

/** The voice a synthesis action speaks with. */
export const voiceIdParam: Param = {
  key: "voiceId",
  label: "Voice",
  type: "string",
  required: true,
  placeholder: "21m00Tcm4TlvDq8ikWAM",
  hint:
    "Voice ID. List them with the List Voices action, or copy one from the Voices page in the " +
    "ElevenLabs app.",
};

export const historyItemIdParam: Param = {
  key: "historyItemId",
  label: "History item ID",
  type: "string",
  required: true,
  hint: "Take it from the `history_item_id` field of a List Generation History result.",
};

/**
 * `model_id` on the TTS bodies.
 *
 * A free string rather than a select: the model catalogue changes without an
 * API version bump, and the authoritative list is the List Models action, whose
 * `can_do_text_to_speech` flag says which entries are legal here. Hard-coding a
 * snapshot of it would go stale silently.
 */
export const ttsModelIdParam: Param = {
  key: "modelId",
  label: "Model ID",
  type: "string",
  placeholder: "eleven_multilingual_v2",
  hint:
    "Leave empty for the API default. Run List Models for the current catalogue — only models " +
    "whose `can_do_text_to_speech` is true work here.",
};

/**
 * `enable_logging=false`, the vendor's zero-retention mode.
 *
 * Documented as enterprise-only, and it removes the generation from history —
 * so the History actions in this app cannot see anything produced with it on.
 */
export const enableLoggingParam: Param = {
  key: "enableLogging",
  label: "Store this generation in history",
  type: "boolean",
  default: true,
  advanced: true,
  hint: "On by default, matching the API. Turning it off selects zero-retention mode, which is " +
    "restricted to enterprise accounts and makes the generation invisible to the History actions.",
};

/** The `voice_settings` override accepted by the TTS bodies. */
export const voiceSettingsParam: Param = {
  key: "voiceSettings",
  label: "Voice settings override",
  type: "json",
  advanced: true,
  hint: "Applied to this request only; the voice's stored settings are unchanged. Accepts " +
    "`stability`, `similarity_boost`, `style` (all 0–1), `use_speaker_boost` and `speed`.",
};

/**
 * The continuity parameters shared by the two text-to-speech actions.
 *
 * They exist because ElevenLabs generates each request independently: without
 * them, concatenating several generations produces audible seams. `previous_text`
 * / `next_text` give the model the surrounding prose; the `*_request_ids` forms
 * do the same by pointing at earlier generations.
 */
export function ttsContinuityParams(): Param[] {
  return [
    {
      key: "previousText",
      label: "Preceding text",
      type: "text",
      advanced: true,
      hint: "The text that came before this chunk. Improves prosody continuity when stitching " +
        "several generations together.",
    },
    {
      key: "nextText",
      label: "Following text",
      type: "text",
      advanced: true,
      hint: "The text that comes after this chunk.",
    },
    {
      key: "previousRequestIds",
      label: "Preceding request IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated `request_id` values of generations that came before this one. An " +
        "alternative to Preceding text when you already have the earlier generations.",
    },
    {
      key: "nextRequestIds",
      label: "Following request IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated `request_id` values of generations that come after this one.",
    },
  ];
}

export interface TtsContinuityInput {
  previousText?: string;
  nextText?: string;
  previousRequestIds?: string;
  nextRequestIds?: string;
}

/** Split a comma-separated request-id list into the array the body wants. */
export function idList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** The shared TTS body fields, built once for both text-to-speech actions. */
export function ttsBody(
  input: TtsContinuityInput & {
    text: string;
    modelId?: string;
    languageCode?: string;
    voiceSettings?: unknown;
    seed?: number;
    applyTextNormalization?: string;
  },
  voiceSettings: unknown,
): Record<string, unknown> {
  const body: Record<string, unknown> = { text: input.text };
  if (input.modelId) body.model_id = input.modelId;
  if (input.languageCode) body.language_code = input.languageCode;
  if (voiceSettings !== undefined) body.voice_settings = voiceSettings;
  if (typeof input.seed === "number") body.seed = input.seed;
  if (input.applyTextNormalization) {
    body.apply_text_normalization = input.applyTextNormalization;
  }
  if (input.previousText) body.previous_text = input.previousText;
  if (input.nextText) body.next_text = input.nextText;
  const previous = idList(input.previousRequestIds);
  if (previous) body.previous_request_ids = previous;
  const next = idList(input.nextRequestIds);
  if (next) body.next_request_ids = next;
  return body;
}

/** The three fields every audio-returning action declares. */
export const audioOutput = [
  { key: "audio_base64", type: "string" as const, label: "Audio, base64-encoded" },
  { key: "content_type", type: "string" as const, label: "Content type ElevenLabs served" },
  { key: "byte_length", type: "number" as const, label: "Decoded audio size in bytes" },
];
