import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the AssemblyAI actions.
 *
 * Every field name, default and enum here is transcribed from AssemblyAI's own
 * machine-readable OpenAPI document (`www.assemblyai.com/docs/openapi.json`, fetched
 * 2026-08-29, `info.version` 1.3.4), not inferred.
 */

export const transcriptIdParam: Param = {
  key: "transcriptId",
  label: "Transcript ID",
  type: "string",
  required: true,
  placeholder: "0072a82b-aa22-4962-add2-6121c36c17c6",
  hint: "Take it from the `id` field of a Submit Transcript / List Transcripts response.",
};

/**
 * AssemblyAI serves the identical `/v2` paths on a second host for EU data residency
 * (`api.eu.assemblyai.com`). A transcript submitted through one host lives only on that
 * host — using the wrong region on a follow-up call answers `404`. See `lib/client.ts`.
 */
export const regionParam: Param = {
  key: "region",
  label: "Region",
  type: "select",
  advanced: true,
  default: "us",
  options: [
    { value: "us", label: "US (api.assemblyai.com) — default" },
    { value: "eu", label: "EU (api.eu.assemblyai.com)" },
  ],
  hint: "Use the SAME region every request in a workflow that shares one transcript ID — a " +
    "transcript created on one region's host does not exist on the other's.",
};

/** `transcript.status` / the `status` list filter. */
export const transcriptStatusOptions = [
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "error", label: "Error" },
];

/** The full PII redaction policy catalog documented on the PII Redaction reference page. */
export const piiPolicyOptions = [
  { value: "account_number", label: "Account number" },
  { value: "banking_information", label: "Banking information" },
  { value: "blood_type", label: "Blood type" },
  { value: "credit_card_cvv", label: "Credit card CVV" },
  { value: "credit_card_expiration", label: "Credit card expiration" },
  { value: "credit_card_number", label: "Credit card number" },
  { value: "date", label: "Date" },
  { value: "date_interval", label: "Date interval" },
  { value: "date_of_birth", label: "Date of birth" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "drug", label: "Drug" },
  { value: "duration", label: "Duration" },
  { value: "email_address", label: "Email address" },
  { value: "event", label: "Event" },
  { value: "filename", label: "Filename" },
  { value: "gender", label: "Gender" },
  { value: "gender_sexuality", label: "Gender sexuality" },
  { value: "healthcare_number", label: "Healthcare number" },
  { value: "injury", label: "Injury" },
  { value: "ip_address", label: "IP address" },
  { value: "language", label: "Language" },
  { value: "location", label: "Location" },
  { value: "location_address", label: "Location address" },
  { value: "location_address_street", label: "Location street address" },
  { value: "location_city", label: "Location city" },
  { value: "location_coordinate", label: "Location coordinate" },
  { value: "location_country", label: "Location country" },
  { value: "location_state", label: "Location state" },
  { value: "location_zip", label: "Location ZIP" },
  { value: "marital_status", label: "Marital status" },
  { value: "medical_condition", label: "Medical condition" },
  { value: "medical_process", label: "Medical process" },
  { value: "money_amount", label: "Money amount" },
  { value: "nationality", label: "Nationality" },
  { value: "number_sequence", label: "Number sequence" },
  { value: "occupation", label: "Occupation" },
  { value: "organization", label: "Organization" },
  { value: "organization_medical_facility", label: "Medical facility" },
  { value: "passport_number", label: "Passport number" },
  { value: "password", label: "Password" },
  { value: "person_age", label: "Person age" },
  { value: "person_name", label: "Person name" },
  { value: "phone_number", label: "Phone number" },
  { value: "physical_attribute", label: "Physical attribute" },
  { value: "political_affiliation", label: "Political affiliation" },
  { value: "religion", label: "Religion" },
  { value: "sexuality", label: "Sexuality" },
  { value: "statistics", label: "Statistics" },
  { value: "time", label: "Time" },
  { value: "url", label: "URL" },
  { value: "us_social_security_number", label: "US Social Security number" },
  { value: "username", label: "Username" },
  { value: "vehicle_id", label: "Vehicle ID" },
  { value: "zodiac_sign", label: "Zodiac sign" },
];

export const speechModelOptions = [
  { value: "universal-3-5-pro", label: "Universal-3.5 Pro" },
  { value: "universal-2", label: "Universal-2" },
];

/**
 * The core transcription + Audio Intelligence toggles `POST /v2/transcript` accepts,
 * exposed as simple flags — every field, default and constraint below is transcribed
 * from `TranscriptOptionalParams` in AssemblyAI's OpenAPI document. Deprecated fields
 * (`auto_chapters`, `summarization`, `summary_model`, `summary_type`, `custom_topics`,
 * `topics`) are NOT exposed — see `index.ts`'s module doc for why (LLM Gateway replaces
 * them; AssemblyAI's own docs point developers there).
 */
export function transcriptOptionParams(): Param[] {
  return [
    // --- language -----------------------------------------------------------
    {
      key: "languageCode",
      label: "Language code",
      type: "string",
      hint: "e.g. en, en_us, es, fr, de. Leave blank to auto-detect. Cannot be combined with " +
        "Language detection. See assemblyai.com/docs/pre-recorded-audio/supported-languages.",
    },
    {
      key: "languageDetection",
      label: "Automatic language detection",
      type: "boolean",
      hint: "Applied automatically when Language code is blank. Set to false only together " +
        "with a Language code — disabling it without one returns an error.",
    },
    {
      key: "languageConfidenceThreshold",
      label: "Language confidence threshold",
      type: "number",
      advanced: true,
      validation: { min: 0, max: 1 },
      hint: "0-1. An error is returned if the detected language's confidence is below this. " +
        "Only used when Automatic language detection is enabled. Defaults to 0.",
    },
    // --- core formatting ------------------------------------------------------
    {
      key: "punctuate",
      label: "Punctuate",
      type: "boolean",
      default: true,
      hint: "Automatic punctuation and casing.",
    },
    {
      key: "formatText",
      label: "Format text",
      type: "boolean",
      default: true,
      hint: "Text formatting (currency, dates, etc). Redact PII requires this to be true.",
    },
    {
      key: "filterProfanity",
      label: "Filter profanity",
      type: "boolean",
      advanced: true,
      hint: "Replace profanity with asterisks.",
    },
    {
      key: "disfluencies",
      label: "Transcribe filler words",
      type: "boolean",
      advanced: true,
      hint: 'Include "umm", "uh", etc. Supported on Universal-3.5 Pro and Universal-2.',
    },
    {
      key: "multichannel",
      label: "Multichannel",
      type: "boolean",
      advanced: true,
      hint: "Transcribe each audio channel independently.",
    },
    // --- speakers ---------------------------------------------------------
    {
      key: "speakerLabels",
      label: "Speaker diarization",
      type: "boolean",
      hint: "Label who said what. Requires Punctuate to be true.",
    },
    {
      key: "speakersExpected",
      label: "Speakers expected",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Requires Speaker diarization. A positive integer hint for how many speakers to " +
        "look for.",
    },
    // --- Audio Intelligence ------------------------------------------------
    {
      key: "autoHighlights",
      label: "Key phrases",
      type: "boolean",
      hint: 'Automatically extract key phrases (formerly "Auto Highlights").',
    },
    {
      key: "contentSafety",
      label: "Content moderation",
      type: "boolean",
      hint: "Detect sensitive content (violence, weapons, hate speech, etc).",
    },
    {
      key: "contentSafetyConfidence",
      label: "Content moderation confidence threshold",
      type: "number",
      advanced: true,
      default: 50,
      validation: { integer: true, min: 25, max: 100 },
      hint: "Requires Content moderation. Defaults to 50.",
    },
    {
      key: "iabCategories",
      label: "Topic detection",
      type: "boolean",
      hint: "Classify the transcript against the IAB taxonomy.",
    },
    {
      key: "entityDetection",
      label: "Entity detection",
      type: "boolean",
      hint: "Identify entities such as names, places and organizations.",
    },
    {
      key: "sentimentAnalysis",
      label: "Sentiment analysis",
      type: "boolean",
      hint: "Classify each sentence as positive, negative or neutral. Requires Punctuate.",
    },
    {
      key: "speechThreshold",
      label: "Speech threshold",
      type: "number",
      advanced: true,
      validation: { min: 0, max: 1 },
      hint: "Reject audio files with less than this fraction of speech (0-1).",
    },
    // --- PII redaction ------------------------------------------------------
    {
      key: "redactPii",
      label: "Redact PII",
      type: "boolean",
      hint: "Redact PII from the transcribed TEXT. Requires Format text to be true.",
    },
    {
      key: "redactPiiPolicies",
      label: "PII policies",
      type: "multiselect",
      advanced: true,
      options: piiPolicyOptions,
      hint: "Which PII categories to redact. Requires Redact PII.",
    },
    {
      key: "redactPiiSub",
      label: "PII substitution",
      type: "select",
      advanced: true,
      default: "hash",
      options: [
        { value: "hash", label: "Hash (####)" },
        { value: "entity_name", label: "Entity name (e.g. [PERSON_NAME])" },
      ],
      hint: "Replacement logic for redacted PII text. Requires Redact PII.",
    },
    {
      key: "redactPiiAudio",
      label: "Redact PII audio",
      type: "boolean",
      advanced: true,
      hint: 'Also produce a copy of the audio with spoken PII "beeped" out. Requires Redact ' +
        "PII.",
    },
    {
      key: "redactPiiAudioQuality",
      label: "Redacted audio format",
      type: "select",
      advanced: true,
      default: "mp3",
      options: [
        { value: "mp3", label: "MP3" },
        { value: "wav", label: "WAV" },
      ],
      hint: "Filetype of the redacted audio. Requires Redact PII audio.",
    },
    // --- model selection / prompting ---------------------------------------
    {
      key: "speechModels",
      label: "Speech models (priority order)",
      type: "multiselect",
      advanced: true,
      options: speechModelOptions,
      hint: "Defaults to Universal-3.5 Pro, falling back to Universal-2, when left blank.",
    },
    {
      key: "domain",
      label: "Domain",
      type: "select",
      advanced: true,
      options: [{ value: "medical-v1", label: "Medical (en, es, de, fr only)" }],
      hint: "Enable a domain-specific model for improved accuracy on specialized terminology.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      advanced: true,
      hint: "Up to 1,500 words of natural-language context. Universal-3.5 Pro only.",
    },
    {
      key: "keytermsPrompt",
      label: "Keyterms prompt",
      type: "array",
      advanced: true,
      item: { type: "string" },
      hint: "Up to 200 (Universal-2) or 1000 (Universal-3.5 Pro) domain-specific words or " +
        "phrases, up to 6 words each, to improve recognition accuracy.",
    },
    // --- webhooks -----------------------------------------------------------
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      advanced: true,
      hint: "Notified with {transcript_id, status} when the transcript finishes or fails.",
    },
    {
      key: "webhookAuthHeaderName",
      label: "Webhook auth header name",
      type: "string",
      advanced: true,
      hint: "Requires Webhook URL and Webhook auth header value.",
    },
    {
      key: "webhookAuthHeaderValue",
      label: "Webhook auth header value",
      type: "secret",
      advanced: true,
      hint: "Requires Webhook URL and Webhook auth header name.",
    },
  ];
}

/** Build the `POST /v2/transcript` body fragment for {@link transcriptOptionParams}. */
export interface TranscriptOptionsInput {
  languageCode?: string;
  languageDetection?: boolean;
  languageConfidenceThreshold?: number;
  punctuate?: boolean;
  formatText?: boolean;
  filterProfanity?: boolean;
  disfluencies?: boolean;
  multichannel?: boolean;
  speakerLabels?: boolean;
  speakersExpected?: number;
  autoHighlights?: boolean;
  contentSafety?: boolean;
  contentSafetyConfidence?: number;
  iabCategories?: boolean;
  entityDetection?: boolean;
  sentimentAnalysis?: boolean;
  speechThreshold?: number;
  redactPii?: boolean;
  redactPiiPolicies?: string[] | string;
  redactPiiSub?: string;
  redactPiiAudio?: boolean;
  redactPiiAudioQuality?: string;
  speechModels?: string[] | string;
  domain?: string;
  prompt?: string;
  keytermsPrompt?: string[] | string;
  webhookUrl?: string;
  webhookAuthHeaderName?: string;
  webhookAuthHeaderValue?: string;
}

/** Normalise a `multiselect`/`array` param into `string[] | undefined` for a request body. */
function arrayOrUndefined(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const arr = Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

export function transcriptOptionsBody(input: TranscriptOptionsInput): Record<string, unknown> {
  return {
    language_code: input.languageCode || undefined,
    language_detection: input.languageDetection,
    language_confidence_threshold: input.languageConfidenceThreshold,
    punctuate: input.punctuate,
    format_text: input.formatText,
    filter_profanity: input.filterProfanity,
    disfluencies: input.disfluencies,
    multichannel: input.multichannel,
    speaker_labels: input.speakerLabels,
    speakers_expected: input.speakersExpected,
    auto_highlights: input.autoHighlights,
    content_safety: input.contentSafety,
    content_safety_confidence: input.contentSafetyConfidence,
    iab_categories: input.iabCategories,
    entity_detection: input.entityDetection,
    sentiment_analysis: input.sentimentAnalysis,
    speech_threshold: input.speechThreshold,
    redact_pii: input.redactPii,
    redact_pii_policies: arrayOrUndefined(input.redactPiiPolicies),
    redact_pii_sub: input.redactPiiSub,
    redact_pii_audio: input.redactPiiAudio,
    redact_pii_audio_quality: input.redactPiiAudioQuality,
    speech_models: arrayOrUndefined(input.speechModels),
    domain: input.domain || undefined,
    prompt: input.prompt || undefined,
    keyterms_prompt: arrayOrUndefined(input.keytermsPrompt),
    webhook_url: input.webhookUrl || undefined,
    webhook_auth_header_name: input.webhookAuthHeaderName || undefined,
    webhook_auth_header_value: input.webhookAuthHeaderValue || undefined,
  };
}

/** Shared output fields for any action that returns a full Transcript resource. */
export const transcriptOutputFields = [
  { key: "id", type: "string" as const, label: "Transcript ID" },
  {
    key: "status",
    type: "string" as const,
    label: "Status (queued, processing, completed, error)",
  },
  { key: "audio_url", type: "string" as const, label: "Audio URL" },
  { key: "text", type: "string" as const, label: "Transcript text" },
  { key: "confidence", type: "number" as const, label: "Overall confidence (0-1)" },
  { key: "audio_duration", type: "number" as const, label: "Audio duration (seconds)" },
  { key: "words", type: "array" as const, label: "Words, with timestamps and confidence" },
  { key: "utterances", type: "array" as const, label: "Utterances (speaker-labeled turns)" },
  { key: "error", type: "string" as const, label: "Error message, when status is error" },
  {
    key: "auto_highlights_result",
    type: "object" as const,
    label: "Key phrases result",
  },
  { key: "content_safety_labels", type: "object" as const, label: "Content moderation result" },
  { key: "iab_categories_result", type: "object" as const, label: "Topic detection result" },
  { key: "entities", type: "array" as const, label: "Detected entities" },
  {
    key: "sentiment_analysis_results",
    type: "array" as const,
    label: "Per-sentence sentiment results",
  },
];
