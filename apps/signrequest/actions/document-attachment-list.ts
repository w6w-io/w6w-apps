import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  documentUuid?: string;
  documentExternalId?: string;
  page?: number;
  limit?: number;
}

/** `GET /document-attachments/` — list attachments, optionally filtered by document. */
const documentAttachmentList: ActionDefinition<Input> = {
  key: "document-attachment-list",
  type: "read",
  resource: "document",
  title: "List Document Attachments",
  description: "List document attachments, optionally filtered by document.",
  params: [
    { key: "documentUuid", label: "Document ID", type: "string" },
    { key: "documentExternalId", label: "Document External ID", type: "string" },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Attachments" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/document-attachments/", {
      query: compact({
        "document__uuid": input.documentUuid,
        "document__external_id": input.documentExternalId,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default documentAttachmentList;
