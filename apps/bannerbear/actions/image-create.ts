import type { ActionDefinition } from "@w6w/types";
import {
  API_BASE,
  asOptionalJson,
  BannerbearClient,
  compact,
  SYNC_API_BASE,
} from "../lib/client.ts";
import {
  dpiParam,
  imageFormatsParam,
  metadataParam,
  modificationsParam,
  proxyParam,
  qualityParam,
  scaleParam,
  versionParam,
} from "../lib/params.ts";

interface ImageResult {
  uid: string;
  status: "pending" | "completed" | "failed";
  template: string;
  files?: Record<string, string>;
  metadata?: string | null;
  error?: string | null;
  self?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface Input {
  template: string;
  modifications?: unknown;
  formats?: string[];
  scale?: number;
  dpi?: number;
  quality?: number;
  proxy?: boolean;
  metadata?: string;
  version?: number;
  useSyncHost?: boolean;
}

/**
 * `POST /images` — render one image from a Template. Async on
 * `api.bannerbear.com` (`202`, poll `image-get` or subscribe a Webhook);
 * synchronous on `sync.api.bannerbear.com` when `useSyncHost` is set (`200`
 * with the finished image inline, or `408` if the render runs long — retry on
 * the async host rather than the sync one when that happens).
 */
const action: ActionDefinition<Input, ImageResult> = {
  key: "image-create",
  type: "perform",
  resource: "image",
  title: "Create Image",
  description:
    "Render an image from an Image Template. Not idempotent by default — pass the same " +
    "workflow invocation id as metadata to correlate retries yourself.",
  idempotent: false,
  params: [
    { key: "template", label: "Template UID", type: "string", required: true },
    modificationsParam,
    imageFormatsParam,
    scaleParam,
    dpiParam,
    qualityParam,
    proxyParam,
    metadataParam,
    versionParam,
    {
      key: "useSyncHost",
      label: "Render synchronously",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Use sync.api.bannerbear.com instead: get the finished image back inline (200) " +
        "rather than a pending record to poll. Returns 408 if the render runs long — this app " +
        "does not retry that automatically.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "files", type: "object", label: "Output files by format" },
  ],

  async execute(input, ctx) {
    const template = String(input.template ?? "").trim();
    if (!template) throw new Error("`template` is required");

    const base = input.useSyncHost === true ? SYNC_API_BASE : API_BASE;
    return await new BannerbearClient(ctx, base).json<ImageResult>("/images", {
      method: "POST",
      body: compact({
        template,
        modifications: asOptionalJson(input.modifications, "modifications") ?? {},
        formats: input.formats,
        scale: input.scale,
        dpi: input.dpi,
        quality: input.quality,
        proxy: input.proxy,
        metadata: input.metadata,
        version: input.version,
      }),
    });
  },
};

export default action;
