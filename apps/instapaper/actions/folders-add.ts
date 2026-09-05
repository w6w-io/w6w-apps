import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient, type InstapaperFolder } from "../lib/client.ts";

/**
 * `POST /api/1/folders/add` — create an organizational folder.
 *
 * Not idempotent: a repeat call with the same title fails with the
 * documented `1250: User already has a folder with this title` rather than
 * returning the existing folder.
 */
interface Input {
  title: string;
}

const foldersAdd: ActionDefinition<Input> = {
  key: "folders-add",
  type: "perform",
  resource: "folder",
  title: "Add Folder",
  description: "Create an organizational folder.",
  idempotent: false,
  params: [{ key: "title", label: "Title", type: "string", required: true }],
  output: [
    { key: "folder_id", type: "number", label: "Folder id" },
    { key: "title", type: "string", label: "Title" },
  ],

  async execute(input, ctx) {
    const [folder] = await new InstapaperClient(ctx).call<InstapaperFolder>(
      "/api/1/folders/add",
      { title: input.title },
    );
    if (!folder) throw new Error("Instapaper returned no folder");
    return folder;
  },
};

export default foldersAdd;
