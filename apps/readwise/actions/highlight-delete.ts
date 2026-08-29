import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { highlightIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/v2/highlights/<id>/` — status `204`, no body.
 *
 * A repeated delete leaves the same end state (the highlight is gone either
 * way), so this is `idempotent: true` — matching the pack-wide convention for
 * delete endpoints.
 */
interface Input {
  highlightId: string;
}

const highlightDelete: ActionDefinition<Input> = {
  key: "highlight-delete",
  type: "perform",
  resource: "highlight",
  title: "Delete Highlight",
  description: "Delete a highlight by id.",
  idempotent: true,
  params: [highlightIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new ReadwiseClient(ctx).status(
      `/highlights/${encodeURIComponent(input.highlightId)}/`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default highlightDelete;
