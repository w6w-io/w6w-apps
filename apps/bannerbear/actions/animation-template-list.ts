import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface AnimationTemplate {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  width: number;
  height: number;
  frame_rate?: number;
  duration_seconds?: number;
  preview?: string | null;
  ui_write_access?: string;
  api_write_access?: string;
  config?: { objects?: unknown[] };
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /animation_templates` — every Animation Template in the workspace, one page at a time. */
const action: ActionDefinition<Input, AnimationTemplate[]> = {
  key: "animation-template-list",
  type: "read",
  resource: "animation-template",
  title: "List Animation Templates",
  description: "List Animation Templates in the workspace.",
  params: [pageParam],
  output: [{ key: "templates", type: "array", label: "Animation templates" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<AnimationTemplate[]>("/animation_templates", {
      query: { page: input.page },
    });
  },
};

export default action;
