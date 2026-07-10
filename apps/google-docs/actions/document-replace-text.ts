import type { ActionDefinition } from "@w6w/types";
import { extractDocumentId, GoogleDocsClient } from "../lib/client.ts";

interface Input {
  documentURL: string;
  text: string;
  replaceText: string;
  matchCase?: boolean;
}

/**
 * `replaceAllText` — global find-and-replace across a document. Matches n8n's
 * `object: text, action: replaceAll` branch.
 */
const documentReplaceText: ActionDefinition<Input> = {
  key: "document-replace-text",
  type: "perform",
  resource: "document",
  title: "Find and Replace Text",
  description: "Replace every occurrence of a search string with a new string.",
  params: [
    { key: "documentURL", label: "Document ID or URL", type: "string", required: true },
    { key: "text", label: "Old Text", type: "text", required: true },
    { key: "replaceText", label: "New Text", type: "text", required: true },
    { key: "matchCase", label: "Match case", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const request = {
      replaceAllText: {
        replaceText: input.replaceText,
        containsText: { text: input.text, matchCase: input.matchCase ?? false },
      },
    };
    return client.request(`/documents/${documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [request] },
    });
  },
};

export default documentReplaceText;
