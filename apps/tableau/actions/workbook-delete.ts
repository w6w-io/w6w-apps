import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `DELETE /sites/{siteId}/workbooks/{workbookId}` — verified against
 * Tableau's "Delete Workbook" reference page: "all of its assets are also
 * deleted, including associated views, data connections, and so on."
 */
const action: ActionDefinition = {
  key: "workbook-delete",
  type: "perform",
  resource: "workbook",
  title: "Delete a workbook",
  description: "Permanently delete a workbook and its views.",
  idempotent: true,
  params: [
    { key: "workbookId", label: "Workbook ID", type: "string", required: true },
    {
      key: "confirm",
      label: "I understand its views and data connections go too",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Tableau does not recover a deleted workbook.",
    },
  ],
  output: [
    { key: "workbookId", type: "string", label: "Workbook ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workbookId = String(p.workbookId ?? "").trim();
    if (!workbookId) throw new Error("`workbookId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a workbook cannot be undone");
    }

    ctx.log("warn", "deleting a Tableau workbook", { workbookId });

    await new TableauClient(ctx).request(`/workbooks/${encodeURIComponent(workbookId)}`, {
      method: "DELETE",
    });
    return { workbookId, deleted: true };
  },
};

export default action;
