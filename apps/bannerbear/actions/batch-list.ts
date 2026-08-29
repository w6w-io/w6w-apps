import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface BatchResult {
  uid: string;
  type: "images";
  status: "pending" | "completed";
  total: number;
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /batches` — recent batches, one page at a time. */
const action: ActionDefinition<Input, BatchResult[]> = {
  key: "batch-list",
  type: "read",
  resource: "batch",
  title: "List Batches",
  description: "List batches in the workspace.",
  params: [pageParam],
  output: [{ key: "batches", type: "array", label: "Batches" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<BatchResult[]>("/batches", {
      query: { page: input.page },
    });
  },
};

export default action;
