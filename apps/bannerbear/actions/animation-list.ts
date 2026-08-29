import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface AnimationResult {
  uid: string;
  status: "queued" | "rendering" | "completed" | "failed";
  template: string;
  files?: Record<string, string>;
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /animations` — recent animation renders, one page at a time. */
const action: ActionDefinition<Input, AnimationResult[]> = {
  key: "animation-list",
  type: "read",
  resource: "animation",
  title: "List Animations",
  description: "List animation renders in the workspace.",
  params: [pageParam],
  output: [{ key: "animations", type: "array", label: "Animations" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<AnimationResult[]>("/animations", {
      query: { page: input.page },
    });
  },
};

export default action;
