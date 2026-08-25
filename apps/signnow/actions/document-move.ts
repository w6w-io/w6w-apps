import type { ActionDefinition } from "@w6w/types";
import { compact, SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  folderId: string;
}

/** `POST /document/{document_id}/move` — moves a document into a folder. */
const documentMove: ActionDefinition<Input> = {
  key: "document-move",
  type: "perform",
  resource: "document",
  title: "Move Document",
  description: "Move a document into a different folder.",
  idempotent: true,
  params: [
    documentIdParam,
    {
      key: "folderId",
      label: "Destination Folder ID",
      type: "string",
      required: true,
      hint: "From List Folders or Create Folder.",
    },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    return new SignNowClient(ctx).request(
      `/document/${encodeURIComponent(input.documentId)}/move`,
      { method: "POST", body: compact({ folder_id: input.folderId }) },
    );
  },
};

export default documentMove;
