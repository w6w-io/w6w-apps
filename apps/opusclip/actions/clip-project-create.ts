import type { ActionDefinition } from "@w6w/types";
import { compact, OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/clip-projects` — submit a long-form video for AI clipping.
 *
 * ## Scope of the exposed params
 *
 * `CreateClipProjectCommand`'s `curationPref`/`renderPref` carry a much wider
 * surface than is exposed here (`RenderPreferenceDto` alone has font, stroke,
 * shadow and per-layout toggles). This action exposes exactly the fields the
 * vendor's own Quickstart and Create-a-Project docs demonstrate as the common
 * path — a curation model, one clip-duration range, topic keywords or a
 * custom prompt, a curation time window, genre, the auto-headline and
 * skip-curation flags, source language, one output aspect ratio, and webhook
 * / email conclusion actions. Fine-grained caption/font styling is what
 * `brandTemplateId` is for — the vendor's own guidance is to configure that in
 * the dashboard rather than pass it inline (see README).
 *
 * `clipDurations` is documented as an array of `[min, max]` pairs (OpusClip
 * tries each); this action exposes a single pair, which covers every example
 * in the vendor's own docs.
 *
 * ## `topicKeywords` vs `customPrompt`
 *
 * `topicKeywords` only applies to `ClipBasic`; `customPrompt` only to
 * `ClipAnything`. Both are passed through as given — the vendor's own API
 * silently ignores the field that does not match the selected model, so this
 * action does not attempt to enforce the pairing itself.
 *
 * Not idempotent: every call creates a new project (and, per Limitations,
 * bills at least the 10-credit API-project minimum).
 */
interface Input {
  videoUrl: string;
  title?: string;
  brandTemplateId?: string;
  sourceLang?: string;
  curationModel?: "ClipBasic" | "ClipAnything";
  clipDurationMinSec?: number;
  clipDurationMaxSec?: number;
  topicKeywords?: string[];
  customPrompt?: string;
  genre?: string;
  rangeStartSec?: number;
  rangeEndSec?: number;
  skipCurate?: boolean;
  enableAutoHook?: boolean;
  layoutAspectRatio?: "portrait" | "landscape" | "square";
  webhookUrl?: string;
  webhookNotifyFailure?: boolean;
  notifyEmail?: string;
  emailNotifyFailure?: boolean;
}

const GENRE_OPTIONS = [
  "Auto",
  "Q&A",
  "Commentary",
  "Marketing",
  "Webinar",
  "Motivational speech",
  "Podcast",
  "Academic",
  "Listicle",
  "Product reviews",
  "How-to",
  "Comedy",
  "Sports commentary",
  "Church",
  "News",
  "Vlog",
  "Gaming",
  "Others",
].map((g) => ({ value: g, label: g }));

const clipProjectCreate: ActionDefinition<Input> = {
  key: "clip-project-create",
  type: "perform",
  resource: "clip-project",
  title: "Create Project",
  description: "Submit a long-form video (YouTube, Google Drive, Vimeo, a public S3 MP4, and " +
    "more) to create a new clipping project.",
  idempotent: false,
  params: [
    {
      key: "videoUrl",
      label: "Video URL",
      type: "string",
      required: true,
      hint: "YouTube, Google Drive, Vimeo, Zoom, Rumble, Twitch, Facebook, LinkedIn, X, Dropbox, " +
        "Riverside, Loom, Frame.io, StreamYard, or a public S3 MP4 link (up to 30GB / 10 hours).",
    },
    { key: "title", label: "Project title", type: "string" },
    {
      key: "brandTemplateId",
      label: "Brand template ID",
      type: "string",
      advanced: true,
      hint: "From brand-template-list, or a preset id like preset-fancy-Karaoke. Omit to use " +
        "the account's default template.",
    },
    {
      key: "curationModel",
      label: "Curation model",
      type: "select",
      advanced: true,
      options: [
        { value: "ClipBasic", label: "ClipBasic (talking-head, default)" },
        { value: "ClipAnything", label: "ClipAnything (any video type, prompt-driven)" },
      ],
    },
    {
      key: "clipDurationMinSec",
      label: "Clip duration min (sec)",
      type: "number",
      advanced: true,
      row: "clip-duration",
      validation: { integer: true, min: 0 },
    },
    {
      key: "clipDurationMaxSec",
      label: "Clip duration max (sec)",
      type: "number",
      advanced: true,
      row: "clip-duration",
      validation: { integer: true, min: 0 },
      hint: "Both min and max form one [min, max] duration bucket, e.g. 0/90. Common vendor " +
        "presets: 0/30, 30/60, 60/90, 90/180.",
    },
    {
      key: "topicKeywords",
      label: "Topic keywords",
      type: "array",
      advanced: true,
      item: { type: "string" },
      hint: "ClipBasic only — keywords to prioritize when finding moments to clip.",
    },
    {
      key: "customPrompt",
      label: "Custom prompt",
      type: "text",
      advanced: true,
      hint: 'ClipAnything only — a natural-language instruction, e.g. "compile all the funny ' +
        'moments".',
    },
    { key: "genre", label: "Genre", type: "select", advanced: true, options: GENRE_OPTIONS },
    {
      key: "rangeStartSec",
      label: "Curate from (sec)",
      type: "number",
      advanced: true,
      row: "range",
      validation: { min: 0 },
    },
    {
      key: "rangeEndSec",
      label: "Curate to (sec)",
      type: "number",
      advanced: true,
      row: "range",
      validation: { min: 0 },
      hint: "Restrict curation to a window of the source video. Provide both, or omit both to " +
        "use the whole video.",
    },
    {
      key: "skipCurate",
      label: "Skip clipping",
      type: "boolean",
      advanced: true,
      hint: "Upload and process the source video without generating clips from it.",
    },
    {
      key: "enableAutoHook",
      label: "Add AI-generated headline",
      type: "boolean",
      advanced: true,
      hint: "Disabled by default for API projects. Has no effect together with skip clipping.",
    },
    { key: "sourceLang", label: "Source language (ISO-639)", type: "string", advanced: true },
    {
      key: "layoutAspectRatio",
      label: "Layout aspect ratio",
      type: "select",
      advanced: true,
      options: [
        { value: "portrait", label: "Portrait (default)" },
        { value: "landscape", label: "Landscape" },
        { value: "square", label: "Square" },
      ],
    },
    {
      key: "webhookUrl",
      label: "Webhook URL on completion",
      type: "string",
      advanced: true,
      row: "webhook",
    },
    {
      key: "webhookNotifyFailure",
      label: "Also notify webhook on failure",
      type: "boolean",
      advanced: true,
      row: "webhook",
    },
    {
      key: "notifyEmail",
      label: "Email on completion",
      type: "string",
      advanced: true,
      row: "email",
    },
    {
      key: "emailNotifyFailure",
      label: "Also notify email on failure",
      type: "boolean",
      advanced: true,
      row: "email",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "stage", type: "string", label: "Processing stage" },
    { key: "model", type: "string", label: "Curation model used" },
    { key: "sourcePlatform", type: "string", label: "Source platform" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "error", type: "string", label: "Error, if any" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const hasClipDuration = input.clipDurationMinSec != null && input.clipDurationMaxSec != null;
    const hasRange = input.rangeStartSec != null && input.rangeEndSec != null;

    const curationPref = compact({
      model: input.curationModel,
      clipDurations: hasClipDuration
        ? [[input.clipDurationMinSec, input.clipDurationMaxSec]]
        : undefined,
      topicKeywords: input.topicKeywords?.length ? input.topicKeywords : undefined,
      customPrompt: input.customPrompt,
      genre: input.genre,
      range: hasRange ? { startSec: input.rangeStartSec, endSec: input.rangeEndSec } : undefined,
      skipCurate: input.skipCurate,
      enableAutoHook: input.enableAutoHook,
    });

    const conclusionActions: Array<Record<string, unknown>> = [];
    if (input.webhookUrl) {
      conclusionActions.push({
        type: "WEBHOOK",
        url: input.webhookUrl,
        notifyFailure: !!input.webhookNotifyFailure,
      });
    }
    if (input.notifyEmail) {
      conclusionActions.push({
        type: "EMAIL",
        email: input.notifyEmail,
        notifyFailure: !!input.emailNotifyFailure,
      });
    }

    const body = compact({
      videoUrl: input.videoUrl,
      brandTemplateId: input.brandTemplateId,
      uploadedVideoAttr: input.title ? { title: input.title } : undefined,
      importPref: input.sourceLang ? { sourceLang: input.sourceLang } : undefined,
      curationPref: Object.keys(curationPref).length > 0 ? curationPref : undefined,
      renderPref: input.layoutAspectRatio
        ? { layoutAspectRatio: input.layoutAspectRatio }
        : undefined,
      conclusionActions: conclusionActions.length > 0 ? conclusionActions : undefined,
    });

    return await new OpusClipClient(ctx).json("/api/clip-projects", { method: "POST", body });
  },
};

export default clipProjectCreate;
