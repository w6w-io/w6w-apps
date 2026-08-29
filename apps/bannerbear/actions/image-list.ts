import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface ImageResult {
  uid: string;
  status: "pending" | "completed" | "failed";
  template: string;
  files?: Record<string, string>;
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /images` — recent image renders, newest first, one page at a time. */
const action: ActionDefinition<Input, ImageResult[]> = {
  key: "image-list",
  type: "read",
  resource: "image",
  title: "List Images",
  description: "List image renders in the workspace.",
  params: [pageParam],
  output: [{ key: "images", type: "array", label: "Images" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<ImageResult[]>("/images", {
      query: { page: input.page },
    });
  },
};

export default action;
