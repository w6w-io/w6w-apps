import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Bannerbear actions.
 *
 * Every field, enum and default here is copied from Bannerbear's own OpenAPI
 * 3.0 document (fetched 2026-08-29 from `https://api.bannerbear.com/v5/openapi.json`),
 * not inferred.
 */

/** `page` — the only pagination Bannerbear documents: no cursor, no `limit`, no total count. */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "1-indexed. Bannerbear paginates by page number only — there is no page size to set and " +
    "no total-count field in the response.",
};

/**
 * `metadata` — an arbitrary string every create endpoint accepts and every
 * corresponding read endpoint round-trips unchanged. Bannerbear does not
 * interpret it; it exists purely so a caller can correlate a render with its
 * own record.
 */
export const metadataParam: Param = {
  key: "metadata",
  label: "Metadata",
  type: "string",
  hint: "Arbitrary string stored with this render and echoed back unchanged — useful for " +
    "correlating the response with your own record. Bannerbear does not interpret it.",
};

/**
 * The per-object and per-template-level override payload for an image or
 * animation render.
 *
 * This is deliberately a single `json` param rather than a generated form.
 * Bannerbear's `modifications.objects[]` schema alone documents 90+ possible
 * keys (position, every text/typography property, background/gradient/blend
 * fields, AI background removal and generation, QR/barcode/rating-specific
 * fields, Lottie playback…) because ONE endpoint accepts overrides for every
 * layer type a template can contain. Modelling that as generated form fields
 * would mean showing barcode options on a template with no barcode layer.
 * Each target object is addressed by `name` or `id` (use one, not both) —
 * both come from the template's own `config.objects[].name` / `.id`.
 */
export const modificationsParam: Param = {
  key: "modifications",
  label: "Modifications",
  type: "json",
  hint: 'Per-layer overrides: `{"objects":[{"name":"title","text":"Hello"}],' +
    '"template":{"width":1200,"transparent":true}}`. Target a layer by `name` or `id` from the ' +
    "template's own config — see `image-template-get`.",
};

/**
 * Full canvas config for an Image or Animation Template — the `config.objects`
 * array. Each element is one of twelve discriminated `Layer` shapes
 * (`text`, `rectangle`, `rectangle_image_container`, `circle`,
 * `circle_image_container`, `image`, `svg_shape`, `qr_code`, `bar_code`,
 * `rating`, `lottie`, `group`), so — same reasoning as {@link modificationsParam}
 * — this is a `json` param rather than a generated layer editor.
 */
export const configParam: Param = {
  key: "config",
  label: "Canvas config",
  type: "json",
  hint: 'Full canvas layers: `{"objects":[{"type":"text","name":"title","text":"Hello",' +
    '"left":0,"top":0}]}`. Replaces the existing config in place — omit to leave it untouched ' +
    "on an update.",
};

/** Image render output formats. `jpg` is the vendor's own default. */
export const imageFormatsOptions = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "pdf", label: "PDF" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
];

export const imageFormatsParam: Param = {
  key: "formats",
  label: "Output formats",
  type: "multiselect",
  options: imageFormatsOptions,
  default: ["jpg"],
  hint: "One render produces one file per selected format. Defaults to JPG only.",
};

/** Animation render output formats. `transparent` forces MOV regardless of this. */
export const animationFormatsOptions = [
  { value: "mp4", label: "MP4" },
  { value: "mov", label: "MOV" },
];

export const animationFormatsParam: Param = {
  key: "formats",
  label: "Output formats",
  type: "multiselect",
  options: animationFormatsOptions,
  default: ["mp4"],
  hint: "Ignored when the modifications set template.transparent — that always yields MOV, " +
    "since MP4 has no alpha channel.",
};

/** Output resolution multiplier — every list of allowed values Bannerbear documents. */
export const scaleParam: Param = {
  key: "scale",
  label: "Scale",
  type: "select",
  options: [
    { value: 1, label: "1x" },
    { value: 2, label: "2x" },
    { value: 3, label: "3x" },
    { value: 4, label: "4x" },
  ],
  default: 1,
  hint: "Output resolution multiplier.",
};

export const dpiParam: Param = {
  key: "dpi",
  label: "DPI",
  type: "number",
  validation: { integer: true, min: 72, max: 600 },
  hint: "DPI metadata embedded in the output for print sizing. 72-600.",
};

export const qualityParam: Param = {
  key: "quality",
  label: "Quality",
  type: "number",
  validation: { integer: true, min: 1, max: 100 },
  hint: "Compression quality for JPG/WebP output only.",
};

export const proxyParam: Param = {
  key: "proxy",
  label: "Proxy external images",
  type: "boolean",
  default: false,
  hint: "Have Bannerbear fetch and resize external images referenced in the modifications " +
    "before rendering, instead of the renderer fetching them directly.",
};

export const versionParam: Param = {
  key: "version",
  label: "Template version",
  type: "number",
  validation: { integer: true },
  hint: "Render against a specific saved version of the template instead of its current one.",
};

/** Shared name/description/tags/width/height fields for template create + update. */
export function templateBaseParams(opts: { nameRequired: boolean }): Param[] {
  return [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: opts.nameRequired,
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated.",
    },
  ];
}

export const widthParam: Param = {
  key: "width",
  label: "Width (px)",
  type: "number",
  validation: { integer: true, min: 100, max: 3000 },
};

export const heightParam: Param = {
  key: "height",
  label: "Height (px)",
  type: "number",
  validation: { integer: true, min: 100, max: 3000 },
};

export const frameRateParam: Param = {
  key: "frameRate",
  label: "Frame rate",
  type: "select",
  options: [
    { value: 24, label: "24 fps" },
    { value: 30, label: "30 fps" },
    { value: 60, label: "60 fps" },
  ],
};

/** The `resource` a Webhook subscribes to. */
export const webhookResourceOptions = [
  { value: "image", label: "Image" },
  { value: "animation", label: "Animation" },
  { value: "batch", label: "Batch" },
  { value: "tool_job", label: "Tool job" },
  { value: "workflow_run", label: "Workflow run" },
];

/** The `event` a Webhook fires on. */
export const webhookEventOptions = [
  { value: "all_events", label: "All events" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export const webhookStatusOptions = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];
