import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `POST /v1.0/generations` — verified against
 * `generations/create-generation.md`'s embedded OpenAPI fragment.
 *
 * `folderIds` accepts at most one id per the schema (`maxItems: 1`), so this
 * action exposes a single `folderId` string rather than a repeat param and
 * wraps it into the one-element array Gamma expects.
 *
 * The deeply nested option groups (`textOptions`, `imageOptions`,
 * `cardOptions`, `sharingOptions`) are exposed as raw JSON rather than one
 * param per leaf field — `cardOptions.headerFooter` alone has six positions
 * each with its own element-type union. A flattened form would need dozens of
 * conditionally-shown params for options most calls never touch; JSON keeps
 * every documented field reachable without that. `pages` is the same JSON
 * escape hatch for the multi-page case, and — per the schema — takes
 * precedence over the top-level per-page fields when both are supplied.
 */
interface Input {
  inputText?: string;
  pages?: unknown;
  format?: string;
  textMode?: string;
  cardSplit?: string;
  numCards?: number;
  title?: string;
  additionalInstructions?: string;
  themeId?: string;
  folderId?: string;
  exportAs?: string;
  publish?: boolean;
  textOptions?: Record<string, unknown>;
  imageOptions?: Record<string, unknown>;
  cardOptions?: Record<string, unknown>;
  sharingOptions?: Record<string, unknown>;
}

const createGeneration: ActionDefinition<Input> = {
  key: "create-generation",
  type: "perform",
  resource: "generation",
  title: "Create Generation",
  description:
    "Start an asynchronous generation from text — Gamma determines the layout. Provide " +
    "inputText for a single-page File, or Pages (JSON) for a multi-page File. Poll Get " +
    "Generation Status with the returned generationId.",
  idempotent: false,
  params: [
    {
      key: "inputText",
      label: "Input Text",
      type: "text",
      hint: "Topic, outline, or full content (1-400,000 characters). Omit only when Pages " +
        "(JSON) is supplied instead.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { value: "presentation", label: "Presentation" },
        { value: "document", label: "Document" },
        { value: "social", label: "Social" },
        { value: "webpage", label: "Webpage" },
      ],
      advanced: true,
    },
    {
      key: "textMode",
      label: "Text Mode",
      type: "select",
      options: [
        { value: "generate", label: "Generate (topic → content)" },
        { value: "condense", label: "Condense (summarize)" },
        { value: "preserve", label: "Preserve (keep as-is)" },
      ],
      advanced: true,
    },
    {
      key: "cardSplit",
      label: "Card Split",
      type: "select",
      options: [
        { value: "auto", label: "Auto" },
        { value: "inputTextBreaks", label: "Input text breaks" },
      ],
      advanced: true,
    },
    {
      key: "numCards",
      label: "Number of Cards",
      type: "number",
      hint: "Target number of cards/slides (minimum 1; ceiling depends on your plan).",
      advanced: true,
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Auto-generated from the content when omitted (1-500 characters).",
      advanced: true,
    },
    {
      key: "additionalInstructions",
      label: "Additional Instructions",
      type: "text",
      hint: "Up to 5,000 characters of extra guidance for the AI.",
      advanced: true,
    },
    {
      key: "themeId",
      label: "Theme ID",
      type: "string",
      hint: "From the List Themes action.",
      advanced: true,
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "From the List Folders action. Gamma accepts at most one.",
      advanced: true,
    },
    {
      key: "exportAs",
      label: "Auto-export As",
      type: "select",
      options: [
        { value: "pdf", label: "PDF" },
        { value: "pptx", label: "PPTX" },
        { value: "png", label: "PNG (zip of card images)" },
      ],
      advanced: true,
    },
    {
      key: "publish",
      label: "Publish As Site",
      type: "boolean",
      hint: "Multi-page (Pages) requests only — publishes the File as a Gamma site once every " +
        "page succeeds.",
      advanced: true,
    },
    {
      key: "textOptions",
      label: "Text Options (JSON)",
      type: "json",
      hint: '{ "amount": "brief"|"medium"|"detailed"|"extensive", "language": "en", "tone": ' +
        '"...", "audience": "..." }',
      advanced: true,
    },
    {
      key: "imageOptions",
      label: "Image Options (JSON)",
      type: "json",
      hint: '{ "model": "...", "source": "aiGenerated"|"noImages"|..., "style": "..." }',
      advanced: true,
    },
    {
      key: "cardOptions",
      label: "Card Options (JSON)",
      type: "json",
      hint: '{ "dimensions": "16x9"|..., "headerFooter": { ... } }',
      advanced: true,
    },
    {
      key: "sharingOptions",
      label: "Sharing Options (JSON)",
      type: "json",
      hint: '{ "workspaceAccess", "externalAccess", "emailOptions": { "access", "recipients" } }',
      advanced: true,
    },
    {
      key: "pages",
      label: "Pages (JSON)",
      type: "json",
      hint: "Up to 50 PageGeneration objects for a multi-page File. Overrides inputText, " +
        "textMode, numCards, format, additionalInstructions, cardSplit, textOptions and " +
        "imageOptions when present.",
      advanced: true,
    },
  ],
  output: [
    { key: "generationId", type: "string", label: "Generation ID" },
    { key: "warnings", type: "string", label: "File-level warnings" },
    { key: "pageWarnings", type: "array", label: "Per-page warnings (index-aligned with Pages)" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/generations", {
      method: "POST",
      body: compact({
        inputText: input.inputText,
        pages: input.pages,
        format: input.format,
        textMode: input.textMode,
        cardSplit: input.cardSplit,
        numCards: input.numCards,
        title: input.title,
        additionalInstructions: input.additionalInstructions,
        themeId: input.themeId,
        folderIds: input.folderId ? [input.folderId] : undefined,
        exportAs: input.exportAs,
        publish: input.publish,
        textOptions: input.textOptions,
        imageOptions: input.imageOptions,
        cardOptions: input.cardOptions,
        sharingOptions: input.sharingOptions,
      }),
    });
  },
};

export default createGeneration;
