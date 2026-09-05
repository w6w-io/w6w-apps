import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `POST /v1.0/generations/from-template` — verified against
 * `generations/create-from-template.md`.
 *
 * The template's structure is preserved by default; `prompt` describes what
 * should CHANGE, not the content itself. `gammaId` must be a workspace
 * template with exactly one page — Gamma validates eligibility at generation
 * time and may reject multi-page or site-bound templates.
 */
interface Input {
  prompt: string;
  gammaId: string;
  title?: string;
  themeId?: string;
  folderId?: string;
  exportAs?: string;
  imageOptions?: Record<string, unknown>;
  sharingOptions?: Record<string, unknown>;
}

const createGenerationFromTemplate: ActionDefinition<Input> = {
  key: "create-generation-from-template",
  type: "perform",
  resource: "generation",
  title: "Create Generation From Template",
  description:
    "Adapt, remix, or transform an existing single-page Gamma. The template's structure is " +
    "preserved by default and changes only when the prompt asks. Poll Get Generation Status " +
    "with the returned generationId.",
  idempotent: false,
  params: [
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      hint: "What should change (1-400,000 characters) — swap content, retarget the audience, " +
        "restructure cards, etc.",
    },
    {
      key: "gammaId",
      label: "Template Gamma ID",
      type: "string",
      required: true,
      hint: "A workspace template's file ID (from Search Templates), must contain exactly one " +
        "page.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Auto-generated from the content when omitted (1-500 characters).",
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
      key: "imageOptions",
      label: "Image Options (JSON)",
      type: "json",
      hint: '{ "model": "...", "style": "..." }',
      advanced: true,
    },
    {
      key: "sharingOptions",
      label: "Sharing Options (JSON)",
      type: "json",
      hint: '{ "workspaceAccess", "externalAccess", "emailOptions": { "access", "recipients" } }',
      advanced: true,
    },
  ],
  output: [
    { key: "generationId", type: "string", label: "Generation ID" },
    { key: "warnings", type: "string", label: "Warnings about the request" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/generations/from-template", {
      method: "POST",
      body: compact({
        prompt: input.prompt,
        gammaId: input.gammaId,
        title: input.title,
        themeId: input.themeId,
        folderIds: input.folderId ? [input.folderId] : undefined,
        exportAs: input.exportAs,
        imageOptions: input.imageOptions,
        sharingOptions: input.sharingOptions,
      }),
    });
  },
};

export default createGenerationFromTemplate;
