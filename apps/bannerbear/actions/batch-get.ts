import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface BatchResult {
  uid: string;
  type: "images";
  status: "pending" | "completed";
  total: number;
  counts?: { completed?: number; failed?: number; invalid?: number; pending?: number };
  errors?: unknown[];
  items?: unknown[];
  self?: string;
  created_at?: string;
  completed_at?: string | null;
}

interface Input {
  uid: string;
}

/** `GET /batches/{uid}` — poll a batch started by `batch-create`. */
const action: ActionDefinition<Input, BatchResult> = {
  key: "batch-get",
  type: "read",
  resource: "batch",
  title: "Get Batch",
  description: "Poll a batch's status and per-item results.",
  params: [
    { key: "uid", label: "Batch UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "counts", type: "object", label: "Completed/failed/invalid/pending counts" },
    { key: "items", type: "array", label: "Per-item results" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<BatchResult>(`/batches/${encodeURIComponent(uid)}`);
  },
};

export default action;
