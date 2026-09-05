import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient, type InstapaperFolder } from "../lib/client.ts";

/**
 * `POST /api/1/folders/set_order` — reorder the user's folders.
 *
 * The wire format is one comma-separated string of `folder_id:position`
 * pairs — this Action collects it as a structured list instead and builds
 * that string, since a raw string param would just move the same parsing
 * burden onto every caller.
 *
 * Per the docs: **all** of the user's folders must be included for
 * consistent ordering; a folder id or position left out is simply ignored,
 * not an error. Idempotent — re-sending the same order leaves the same order.
 */
interface Input {
  order: Array<{ folderId: number; position: number }>;
}

const foldersSetOrder: ActionDefinition<Input> = {
  key: "folders-set-order",
  type: "perform",
  resource: "folder",
  title: "Set Folder Order",
  description: "Reorder the user's folders. Include every folder for a consistent result.",
  idempotent: true,
  params: [
    {
      key: "order",
      label: "Folder order",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          { key: "folderId", label: "Folder ID", type: "number", required: true },
          { key: "position", label: "Position", type: "number", required: true },
        ],
      },
    },
  ],
  output: [{ key: "folders", type: "array", label: "The user's re-ordered folder list" }],

  async execute(input, ctx) {
    const order = (input.order ?? [])
      .map((entry) => `${entry.folderId}:${entry.position}`)
      .join(",");
    if (!order) throw new Error("`order` must include at least one folder");
    const folders = await new InstapaperClient(ctx).call<InstapaperFolder>(
      "/api/1/folders/set_order",
      { order },
    );
    return { folders };
  },
};

export default foldersSetOrder;
