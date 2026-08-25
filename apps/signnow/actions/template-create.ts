import type { ActionDefinition } from "@w6w/types";
import { compact, SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  documentName: string;
}

/**
 * `POST /template` — creates a reusable template by flattening an existing
 * document (its fields, roles and routing) into a new template.
 */
const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template from Document",
  description: "Flatten an existing document into a reusable template.",
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "documentName",
      label: "Template Name",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Template ID" }],

  execute(input, ctx) {
    return new SignNowClient(ctx).request("/template", {
      method: "POST",
      body: compact({ document_id: input.documentId, document_name: input.documentName }),
    });
  },
};

export default templateCreate;
