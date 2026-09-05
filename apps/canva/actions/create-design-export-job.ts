import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

type Format =
  | "pdf"
  | "jpg"
  | "png"
  | "pptx"
  | "gif"
  | "mp4"
  | "html_bundle"
  | "html_standalone"
  | "csv";

interface Input {
  designId: string;
  format: Format;
  exportQuality?: "regular" | "pro";
  pdfSize?: "a4" | "a3" | "letter" | "legal";
  jpgQuality?: number;
  height?: number;
  width?: number;
  lossless?: boolean;
  transparentBackground?: boolean;
  asSingleImage?: boolean;
  mp4Quality?:
    | "horizontal_480p"
    | "horizontal_720p"
    | "horizontal_1080p"
    | "horizontal_4k"
    | "vertical_480p"
    | "vertical_720p"
    | "vertical_1080p"
    | "vertical_4k";
  pages?: number[];
}

/**
 * `POST /v1/exports` — requires `design:content:read`. Rate limited to 20
 * requests/minute per user, with additional per-integration/per-document/
 * per-user throttles (see Canva's docs).
 *
 * `get-design-export-formats` tells you which formats a specific design
 * actually supports before calling this.
 *
 * ASYNCHRONOUS: returns `{ job: { id, status: "in_progress" } }`. Poll
 * `get-design-export-job` for the download URL(s), which expire after 24
 * hours.
 */
const createDesignExportJob: ActionDefinition<Input> = {
  key: "create-design-export-job",
  type: "perform",
  resource: "export",
  title: "Create Design Export Job",
  description: "Start an asynchronous job to export a design as a file (PDF, image, video, " +
    "PPTX, HTML, or CSV).",
  // Each call starts a new export job; a retry after a dropped response
  // risks a duplicate export rather than converging on the same result, and
  // exports are separately rate-limited per document.
  idempotent: false,
  params: [
    { key: "designId", label: "Design ID", type: "string", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      options: [
        { value: "pdf", label: "PDF" },
        { value: "jpg", label: "JPEG" },
        { value: "png", label: "PNG" },
        { value: "pptx", label: "PowerPoint (PPTX)" },
        { value: "gif", label: "GIF" },
        { value: "mp4", label: "MP4" },
        { value: "html_bundle", label: "HTML bundle (zip)" },
        { value: "html_standalone", label: "Standalone HTML" },
        { value: "csv", label: "CSV (tabular designs only)" },
      ],
    },
    {
      key: "exportQuality",
      label: "Export quality",
      type: "select",
      default: "regular",
      options: [
        { value: "regular", label: "Regular" },
        { value: "pro", label: "Pro (may fail without premium elements license)" },
      ],
      hint: "Applies to pdf, jpg, png, gif, mp4.",
      showIf: { "in": [{ var: "format" }, ["pdf", "jpg", "png", "gif", "mp4"]] },
    },
    {
      key: "pdfSize",
      label: "PDF paper size",
      type: "select",
      default: "a4",
      options: [
        { value: "a4", label: "A4" },
        { value: "a3", label: "A3" },
        { value: "letter", label: "Letter" },
        { value: "legal", label: "Legal" },
      ],
      hint: "Only applies to Canva Docs.",
      showIf: { "==": [{ var: "format" }, "pdf"] },
    },
    {
      key: "jpgQuality",
      label: "JPEG quality",
      type: "number",
      validation: { min: 1, max: 100, integer: true },
      showIf: { "==": [{ var: "format" }, "jpg"] },
    },
    {
      key: "height",
      label: "Height (px)",
      type: "number",
      validation: { min: 40, max: 25000, integer: true },
      hint: "For jpg, png, gif. Defaults to the design's own dimensions.",
      showIf: { "in": [{ var: "format" }, ["jpg", "png", "gif"]] },
    },
    {
      key: "width",
      label: "Width (px)",
      type: "number",
      validation: { min: 40, max: 25000, integer: true },
      showIf: { "in": [{ var: "format" }, ["jpg", "png", "gif"]] },
    },
    {
      key: "lossless",
      label: "Lossless PNG",
      type: "boolean",
      default: true,
      hint: "Premium-plan feature to disable (compress).",
      showIf: { "==": [{ var: "format" }, "png"] },
    },
    {
      key: "transparentBackground",
      label: "Transparent background",
      type: "boolean",
      default: false,
      hint: "Premium-plan feature.",
      showIf: { "==": [{ var: "format" }, "png"] },
    },
    {
      key: "asSingleImage",
      label: "Merge pages into a single image",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "format" }, "png"] },
    },
    {
      key: "mp4Quality",
      label: "Video orientation/resolution",
      type: "select",
      required: false,
      options: [
        { value: "horizontal_480p", label: "Horizontal 480p" },
        { value: "horizontal_720p", label: "Horizontal 720p" },
        { value: "horizontal_1080p", label: "Horizontal 1080p" },
        { value: "horizontal_4k", label: "Horizontal 4K" },
        { value: "vertical_480p", label: "Vertical 480p" },
        { value: "vertical_720p", label: "Vertical 720p" },
        { value: "vertical_1080p", label: "Vertical 1080p" },
        { value: "vertical_4k", label: "Vertical 4K" },
      ],
      showIf: { "==": [{ var: "format" }, "mp4"] },
    },
    {
      key: "pages",
      label: "Pages to export",
      type: "json",
      hint: "Array of 1-based page numbers. Omit to export every page (html_bundle/" +
        "html_standalone allow at most one page).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);

    let format: Record<string, unknown>;
    switch (input.format) {
      case "pdf":
        format = {
          type: "pdf",
          export_quality: input.exportQuality,
          size: input.pdfSize,
          pages: input.pages,
        };
        break;
      case "jpg":
        format = {
          type: "jpg",
          quality: input.jpgQuality,
          export_quality: input.exportQuality,
          height: input.height,
          width: input.width,
          pages: input.pages,
        };
        break;
      case "png":
        format = {
          type: "png",
          export_quality: input.exportQuality,
          height: input.height,
          width: input.width,
          lossless: input.lossless,
          transparent_background: input.transparentBackground,
          as_single_image: input.asSingleImage,
          pages: input.pages,
        };
        break;
      case "gif":
        format = {
          type: "gif",
          export_quality: input.exportQuality,
          height: input.height,
          width: input.width,
          pages: input.pages,
        };
        break;
      case "mp4":
        format = {
          type: "mp4",
          quality: input.mp4Quality,
          export_quality: input.exportQuality,
          pages: input.pages,
        };
        break;
      default:
        // pptx, html_bundle, html_standalone, csv all take only `pages`.
        format = { type: input.format, pages: input.pages };
    }

    const res = await client.request<{ job: Record<string, unknown> }>("/rest/v1/exports", {
      method: "POST",
      body: { design_id: input.designId, format },
    });
    return res.job;
  },
};

export default createDesignExportJob;
