import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1.1/highlights/<highlight-id>/delete` — delete a highlight.
 * The docs state "Output: None" — unlike every other mutation in this app,
 * there is no returned object at all, so this tolerates a genuinely empty
 * response body (see `lib/client.ts`'s `callVoid`).
 */
interface Input {
  highlightId: number;
}

const highlightsDelete: ActionDefinition<Input> = {
  key: "highlights-delete",
  type: "perform",
  resource: "highlight",
  title: "Delete Highlight",
  description: "Delete a highlight.",
  idempotent: true,
  params: [{ key: "highlightId", label: "Highlight ID", type: "number", required: true }],
  output: [{ key: "highlight_id", type: "number", label: "Highlight id deleted" }],

  async execute(input, ctx) {
    await new InstapaperClient(ctx).callVoid(
      `/api/1.1/highlights/${encodeURIComponent(String(input.highlightId))}/delete`,
    );
    return { highlight_id: input.highlightId };
  },
};

export default highlightsDelete;
