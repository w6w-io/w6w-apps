import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  /**
   * When true, flatten `body.content[].paragraph.elements[].textRun.content`
   * down to a single joined string — the same shape n8n's `simple: true`
   * mode returns. Preserves the raw response otherwise.
   */
  simple?: boolean;
}

interface DocsResponse {
  documentId?: string;
  body?: {
    content?: Array<{
      paragraph?: {
        elements?: Array<{ textRun?: { content?: string } }>;
      };
    }>;
  };
  [k: string]: unknown;
}

/**
 * Fetch a document by ID (or full URL — mirrors n8n's `extractID` helper).
 */
const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Retrieve a document by ID or Google Docs URL.",
  params: [
    {
      key: "documentURL",
      label: "Document ID or URL",
      type: "string",
      required: true,
      hint: "Paste the document ID or the full Google Docs URL.",
    },
    {
      key: "simple",
      label: "Simplify",
      type: "boolean",
      default: true,
      hint: "Return a flat `{ documentId, content }` shape instead of the raw Docs response.",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const response = await client.request<DocsResponse>(`/documents/${documentId}`);

    if (input.simple === false) return response;

    const content = (response.body?.content ?? []).reduce<string[]>((acc, item) => {
      const elements = item?.paragraph?.elements;
      if (!elements) return acc;
      for (const el of elements) {
        if (el.textRun?.content) acc.push(el.textRun.content);
      }
      return acc;
    }, []).join("");

    return { documentId, content };
  },
};

export default documentGet;
