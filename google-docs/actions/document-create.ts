import type { ActionDefinition } from "@w6w/types";
import { GoogleDocsClient } from "../lib/client.ts";

interface Input {
  title: string;
  /** Google Drive folder ID. When omitted the doc lands in the drive root. */
  folderId?: string;
}

/**
 * Create a new Google Docs document.
 *
 * n8n does this via the Drive API (POST `/drive/v3/files` with the Docs
 * MIME type) rather than the Docs API — Docs `documents.create` doesn't
 * accept `parents`, so if you need to put the doc inside a folder Drive
 * is the only way. We mirror that behavior.
 */
const documentCreate: ActionDefinition<Input> = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create Document",
  description: "Create a new Google Doc (optionally inside a specific Drive folder).",
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint:
        "Optional Drive folder to place the document in. Omit for the drive root. Also accepts a shared drive ID.",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const body: Record<string, unknown> = {
      name: input.title,
      mimeType: "application/vnd.google-apps.document",
    };
    if (input.folderId && input.folderId !== "default") {
      body.parents = [input.folderId];
    }
    return client.request("/drive/v3/files", { method: "POST", body });
  },
};

export default documentCreate;
