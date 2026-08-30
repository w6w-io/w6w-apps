import type { ActionDefinition } from "@w6w/types";
import { csv, DeepgramClient, query } from "../lib/client.ts";

/**
 * `POST /v1/listen` — transcribe audio or video from a URL.
 *
 * The action this app exists for. Deepgram **fetches the media itself**, so
 * nothing passes through the workflow: a recording in object storage, a
 * meeting export, a support call — any URL Deepgram can reach.
 *
 * ## Synchronous or callback, and the choice is about length
 *
 * Without a callback this waits for the transcript and returns it, which is
 * right for a voicemail and wrong for a two-hour recording — that request will
 * outlive whatever HTTP timeout sits in the way, and the work is wasted.
 *
 * With `callbackUrl`, Deepgram answers immediately with a `request_id` and
 * POSTs the finished transcript to that URL. **That is the correct shape for
 * anything longer than a few minutes**, and the `request_id` is what
 * `request-get` later looks up.
 *
 * ## Two options that are governance decisions, not tuning knobs
 *
 * **`mip_opt_out`** opts the request out of Deepgram's Model Improvement
 * Program. Left off, submitted audio may be used to improve Deepgram's models —
 * which for customer calls, medical dictation or anything under an NDA is a
 * decision somebody should make deliberately rather than inherit from a
 * default. Opting out carries a pricing impact, which is exactly why it is
 * surfaced rather than silently chosen either way.
 *
 * **`redact`** removes PII from the transcript before it is returned — `pci`,
 * `ssn`, `numbers`, `pii`. On call recordings that is often the difference
 * between a transcript that can be stored and one that cannot.
 *
 * ## Formatting defaults worth knowing
 *
 * `smart_format` and `punctuate` produce text a person can read;
 * `diarize_model` labels who is speaking, which is what makes a two-party call
 * useful. `keyterm` teaches the model product names it would otherwise
 * mishear — the single highest-value option for domain audio.
 */
const action: ActionDefinition = {
  key: "audio-transcribe",
  type: "perform",
  resource: "transcription",
  title: "Transcribe audio from a URL",
  description:
    "Deepgram fetches the media itself, so nothing passes through the workflow. Give a callback " +
    "URL for anything longer than a few minutes — a synchronous call will outlive its timeout.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Audio URL",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://example.com/recording.mp3",
      hint: "Deepgram fetches this itself, so it must be reachable from the public internet — a " +
        "pre-signed storage URL is the usual answer.",
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      default: "",
      hint: "Deepgram POSTs the finished transcript here and returns a request id immediately. " +
        "Use it for anything over a few minutes.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      default: "nova-3",
      hint: "`model-list` has what this project can use.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      default: "",
      placeholder: "en",
      hint: "A BCP-47 tag. Leave blank and set Detect Language instead when it varies.",
    },
    {
      key: "detectLanguage",
      label: "Detect Language",
      type: "boolean",
      default: false,
      hint: "Identifies the dominant language rather than assuming one.",
    },
    {
      key: "smartFormat",
      label: "Smart Format",
      type: "boolean",
      default: true,
      hint: "Formats dates, times, currency and phone numbers into readable text.",
    },
    { key: "punctuate", label: "Punctuate", type: "boolean", default: true },
    { key: "paragraphs", label: "Paragraphs", type: "boolean", default: false },
    {
      key: "diarize",
      label: "Identify Speakers",
      type: "boolean",
      default: false,
      hint: "Labels each word with a speaker — what makes a two-party call readable.",
    },
    {
      key: "keyterm",
      label: "Key Terms",
      type: "string",
      default: "",
      placeholder: "w6w, Postgres, Kubernetes",
      hint: "Comma-separated product names and jargon the model would otherwise mishear. The " +
        "single highest-value option for domain audio.",
    },
    {
      key: "redact",
      label: "Redact",
      type: "string",
      default: "",
      placeholder: "pii,pci",
      hint: "Removes sensitive content before the transcript is returned — `pii`, `pci`, `ssn`, " +
        "`numbers`. Often the difference between a transcript you may store and one you may not.",
    },
    {
      key: "mipOptOut",
      label: "Opt Out of Model Improvement",
      type: "boolean",
      default: false,
      hint: "Left off, submitted audio may be used to improve Deepgram's models. For customer " +
        "calls or anything under an NDA this is a decision to make, not inherit. It has a " +
        "pricing impact.",
    },
    {
      key: "summarize",
      label: "Summarize",
      type: "boolean",
      default: false,
      advanced: true,
    },
    { key: "topics", label: "Detect Topics", type: "boolean", default: false, advanced: true },
    { key: "sentiment", label: "Sentiment", type: "boolean", default: false, advanced: true },
    { key: "intents", label: "Detect Intents", type: "boolean", default: false, advanced: true },
    {
      key: "detectEntities",
      label: "Detect Entities",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "multichannel",
      label: "Multichannel",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Transcribes each audio channel separately — right for a two-track call recording, " +
        "and wrong for stereo music.",
    },
    {
      key: "tag",
      label: "Tags",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated labels that show up in usage reporting — how you attribute spend to " +
        "a workflow.",
    },
  ],
  output: [
    { key: "transcript", type: "string", label: "The plain transcript, when synchronous" },
    { key: "request_id", type: "string", label: "The request id, when using a callback" },
    { key: "pending", type: "boolean", label: "True when the result is coming to the callback" },
    { key: "results", type: "object", label: "Deepgram's full result payload" },
    { key: "metadata", type: "object", label: "Duration, model and channel information" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const url = String(p.url ?? "").trim();
    if (!url) throw new Error("`url` is required — this app transcribes by URL, never by upload");
    const callbackUrl = String(p.callbackUrl ?? "").trim();

    const bool = (v: unknown, fallback = false) => (v === undefined ? fallback : v === true);

    const body = await new DeepgramClient(ctx).request<{
      request_id?: string;
      metadata?: { request_id?: string; duration?: number };
      results?: {
        channels?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
      };
    }>("/v1/listen", {
      method: "POST",
      body: { url },
      query: query({
        callback: callbackUrl,
        model: p.model === undefined ? "nova-3" : String(p.model),
        language: p.language,
        detect_language: bool(p.detectLanguage) || undefined,
        smart_format: bool(p.smartFormat, true),
        punctuate: bool(p.punctuate, true),
        paragraphs: bool(p.paragraphs) || undefined,
        diarize: bool(p.diarize) || undefined,
        keyterm: csv(p.keyterm),
        redact: csv(p.redact),
        mip_opt_out: bool(p.mipOptOut) || undefined,
        summarize: bool(p.summarize) ? "v2" : undefined,
        topics: bool(p.topics) || undefined,
        sentiment: bool(p.sentiment) || undefined,
        intents: bool(p.intents) || undefined,
        detect_entities: bool(p.detectEntities) || undefined,
        multichannel: bool(p.multichannel) || undefined,
        tag: csv(p.tag),
      }),
    });

    const requestId = body?.request_id ?? body?.metadata?.request_id;
    if (callbackUrl) {
      // Nothing has been transcribed yet — the result is coming to the callback.
      ctx.log("info", "queued a Deepgram transcription to a callback", { requestId });
      return { request_id: requestId, pending: true, metadata: body?.metadata };
    }

    // The plain transcript is what most steps want; the full payload stays available.
    const transcript = body?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    ctx.log("info", "transcribed audio with Deepgram", {
      requestId,
      seconds: body?.metadata?.duration,
    });
    return { transcript, request_id: requestId, pending: false, ...body };
  },
};

export default action;
