import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `GET /docs/{documentId}` — the parsed document, in the same compact shape
 * Airparser delivers through a webhook.
 */
interface Input {
  documentId: string;
}

interface Output {
  _id: string;
  name: string;
  content_type: string;
  status: string;
  created_at: string;
  processed_at: string;
  filename: string;
  credits: number;
  json: Record<string, unknown>;
}

const documentGet: ActionDefinition<Input, Output> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Get a parsed document, in the same compact shape delivered through a webhook.",
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The doc_id / _id returned by an upload or by List Documents.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "processed_at", type: "string", label: "Processed at" },
    { key: "filename", type: "string", label: "File name" },
    { key: "credits", type: "number", label: "Credits consumed" },
    { key: "json", type: "object", label: "Extracted data" },
  ],

  execute(input, ctx) {
    return new AirparserClient(ctx).request<Output>(
      `/docs/${encodeURIComponent(input.documentId)}`,
    );
  },
};

export default documentGet;
