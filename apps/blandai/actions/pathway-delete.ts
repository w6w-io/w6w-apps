import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `DELETE /v1/pathway/{pathway_id}` — delete a pathway.
 *
 * Verified against `docs.bland.ai/api-v1/delete/delete_pathway` (doc slug
 * `delete_pathway`; the real verb is DELETE, confirmed via `llms-full.txt`'s
 * `DELETE https://api.bland.ai/v1/pathway/{pathway_id}` — note the vendor's
 * own doc lists this under `POST` in its nav ("Delete Pathway"
 * `api-v1/post/delete_pathway`), but the endpoint itself is DELETE).
 */
interface Input {
  pathwayId: string;
}

const pathwayDelete: ActionDefinition<Input> = {
  key: "pathway-delete",
  type: "perform",
  resource: "pathway",
  title: "Delete Pathway",
  description: "Delete a conversational pathway.",
  // Deleting an already-deleted pathway ends in the same state (gone).
  idempotent: true,
  params: [
    { key: "pathwayId", label: "Pathway ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "success or error" },
    { key: "message", type: "string", label: "Status message" },
  ],

  async execute(input, ctx) {
    const res = await new BlandClient(ctx).request<{ status: string; message?: string }>(
      `/v1/pathway/${encodeURIComponent(input.pathwayId)}`,
      { method: "DELETE" },
    );
    return { status: res.status, message: res.message };
  },
};

export default pathwayDelete;
