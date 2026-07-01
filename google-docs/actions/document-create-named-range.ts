import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  name: string;
  startIndex: number;
  endIndex: number;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
}

/**
 * `createNamedRange` — assign a name to a range. Names don't need to be unique
 * (mirrors n8n).
 */
const documentCreateNamedRange: ActionDefinition<Input> = {
  key: "document-create-named-range",
  type: "perform",
  resource: "document",
  title: "Create Named Range",
  description: "Create a named range over a start/end index within a segment.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
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
          createNamedRange: {
            name: input.name,
            range: {
              segmentId,
              startIndex: input.startIndex,
              endIndex: input.endIndex,
            },
          },
        }],
      },
    });
  },
};

export default documentCreateNamedRange;
