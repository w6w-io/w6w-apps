import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/documents/{documentID}` — a document, including its Markdown content. */
interface Input {
  documentID: string;
}

const getDocument: ActionDefinition<Input> = {
  key: "get-document",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Fetch a single document (wiki post), including its content.",
  params: [{ key: "documentID", label: "Document ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Title" },
    { key: "link", type: "string", label: "URL to this document" },
    { key: "content", type: "string", label: "Content (Markdown)" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/documents/${encodeURIComponent(input.documentID)}`);
  },
};

export default getDocument;
