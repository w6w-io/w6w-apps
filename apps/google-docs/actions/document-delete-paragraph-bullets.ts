import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  startIndex: number;
  endIndex: number;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
}

/** `deleteParagraphBullets` — remove bullet glyphs from a range. */
const documentDeleteParagraphBullets: ActionDefinition<Input> = {
  key: "document-delete-paragraph-bullets",
  type: "perform",
  resource: "document",
  title: "Delete Paragraph Bullets",
  description: "Remove bullet glyphs from a paragraph range.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "startIndex", label: "Start Index", type: "number", required: true },
    { key: "endIndex", label: "End Index", type: "number", required: true },
    {
      key: "insertSegment",
      label: "Segment",
      type: "select",
      default: "body",
      options: [
        { value: "body", label: "Body" },
        { value: "header", label: "Header" },
        { value: "footer", label: "Footer" },
      ],
    },
    { key: "segmentId", label: "Segment ID", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const segmentId = input.insertSegment && input.insertSegment !== "body"
      ? (input.segmentId ?? "")
      : "";
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: {
        requests: [{
          deleteParagraphBullets: {
            range: { segmentId, startIndex: input.startIndex, endIndex: input.endIndex },
          },
        }],
      },
    });
  },
};

export default documentDeleteParagraphBullets;
