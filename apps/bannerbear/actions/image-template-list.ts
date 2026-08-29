import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface ImageTemplate {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  width: number;
  height: number;
  responsive?: boolean;
  preview?: string | null;
  ui_write_access?: string;
  api_write_access?: string;
  config?: { objects?: unknown[] };
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /image_templates` — every Image Template in the workspace, one page at a time. */
const action: ActionDefinition<Input, ImageTemplate[]> = {
  key: "image-template-list",
  type: "read",
  resource: "image-template",
  title: "List Image Templates",
  description: "List Image Templates in the workspace.",
  params: [pageParam],
  output: [{ key: "templates", type: "array", label: "Image templates" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<ImageTemplate[]>("/image_templates", {
      query: { page: input.page },
    });
  },
};

export default action;
