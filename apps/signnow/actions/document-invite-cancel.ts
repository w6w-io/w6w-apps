import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/** `PUT /document/{document_id}/fieldinvitecancel` — cancels a pending invite. */
const documentInviteCancel: ActionDefinition<Input> = {
  key: "document-invite-cancel",
  type: "perform",
  resource: "document",
  title: "Cancel Invite",
  description: "Cancel a pending signature invite for a document.",
  idempotent: true,
  params: [documentIdParam],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    return new SignNowClient(ctx).request(
      `/document/${encodeURIComponent(input.documentId)}/fieldinvitecancel`,
      { method: "PUT" },
    );
  },
};

export default documentInviteCancel;
