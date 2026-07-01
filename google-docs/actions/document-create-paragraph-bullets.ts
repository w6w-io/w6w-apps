import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  bulletPreset:
    | "BULLET_DISC_CIRCLE_SQUARE"
    | "BULLET_CHECKBOX"
    | "NUMBERED_DECIMAL_NESTED";
  startIndex: number;
  endIndex: number;
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
}

/**
 * `createParagraphBullets` — apply a bullet preset over a range. The preset
 * values match Google's `BulletGlyphPreset` enum.
 */
const documentCreateParagraphBullets: ActionDefinition<Input> = {
  key: "document-create-paragraph-bullets",
  type: "perform",
  resource: "document",
  title: "Create Paragraph Bullets",
  description: "Apply a bullet style to a paragraph range.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    {
      key: "bulletPreset",
      label: "Style",
      type: "select",
      required: true,
      default: "BULLET_DISC_CIRCLE_SQUARE",
      options: [
        { value: "BULLET_DISC_CIRCLE_SQUARE", label: "Bullet List" },
        { value: "BULLET_CHECKBOX", label: "Checkbox List" },
        { value: "NUMBERED_DECIMAL_NESTED", label: "Numbered List" },
      ],
    },
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
          createParagraphBullets: {
            bulletPreset: input.bulletPreset,
            range: { segmentId, startIndex: input.startIndex, endIndex: input.endIndex },
          },
        }],
      },
    });
  },
};

export default documentCreateParagraphBullets;
