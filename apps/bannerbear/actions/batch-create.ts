import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BannerbearClient } from "../lib/client.ts";

interface BatchItem {
  uid: string;
  status: "pending" | "completed" | "failed";
  template: string;
  files?: Record<string, string>;
  error?: string | null;
}

interface BatchResult {
  uid: string;
  type: "images";
  status: "pending" | "completed";
  total: number;
  counts?: { completed?: number; failed?: number; invalid?: number; pending?: number };
  errors?: unknown[];
  items?: BatchItem[];
  self?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface Input {
  items: unknown;
}

/**
 * `POST /batches` — submit up to 100 image renders in one call. Each element
 * of `items` is a full image-create payload (`template`, `modifications`,
 * and optionally `formats`/`scale`/`dpi`/`quality`/`proxy`/`metadata`/`version`
 * — identical shape to `image-create`'s own body, one per image). This is the
 * closest v5 equivalent to what other Bannerbear API versions called a
 * "collection": one call, many images, one status object to poll instead of
 * many.
 */
const action: ActionDefinition<Input, BatchResult> = {
  key: "batch-create",
  type: "perform",
  resource: "batch",
  title: "Create Batch",
  description:
    "Render up to 100 images in one call. Not idempotent — every call creates a new batch.",
  idempotent: false,
  params: [
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint: 'Array of up to 100 image payloads: `[{"template":"…","modifications":{"objects":' +
        '[{"name":"title","text":"Hello"}]}}]`. Each element accepts every field image-create ' +
        "does (formats, scale, dpi, quality, proxy, metadata, version).",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total", type: "number", label: "Total items" },
    { key: "counts", type: "object", label: "Completed/failed/invalid/pending counts" },
  ],

  async execute(input, ctx) {
    const items = asOptionalJson<unknown[]>(input.items, "items");
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("`items` must be a non-empty JSON array");
    }
    if (items.length > 100) throw new Error("`items` accepts at most 100 elements");

    return await new BannerbearClient(ctx).json<BatchResult>("/batches", {
      method: "POST",
      body: { type: "images", items },
    });
  },
};

export default action;
