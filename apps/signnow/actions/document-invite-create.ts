import type { ActionDefinition } from "@w6w/types";
import { compact, SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  to: string;
  from?: string;
  cc?: string;
  subject?: string;
  message?: string;
}

/**
 * `POST /document/{document_id}/invite` — send an invite to sign.
 *
 * SignNow documents **two distinct payload shapes** on this one endpoint,
 * chosen by whether the document has fillable fields:
 *
 *   - **Free-form invite** (no fields on the document): `to` is a single
 *     email address, e.g. `{"from":"sender@email.com","to":"signer@email.com"}`.
 *   - **Role-based invite** (the document has at least one field, each field
 *     bound to a role): `to` is an array of recipient objects — `email`,
 *     `role_id`, `role`, `order`, and per-recipient options
 *     (`reassign`, `decline_by_signature`, `reminder`, `expiration_days`,
 *     `authentication_type`, `password`, `subject`, `message`).
 *
 * This app accepts `to` as free text and dispatches on its shape: a value
 * starting with `[` is parsed as the role-based recipient array (JSON — build
 * it with `role_id`s from Get Document's `roles`); anything else is sent as a
 * single free-form email address.
 */
const documentInviteCreate: ActionDefinition<Input> = {
  key: "document-invite-create",
  type: "perform",
  resource: "document",
  title: "Send Invite to Sign",
  description:
    "Send a signature invite for a document. A plain email address sends a free-form invite " +
    "(document has no fields); a JSON array of recipient objects sends a role-based invite " +
    "(document has fields bound to roles).",
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "to",
      label: "To",
      type: "text",
      required: true,
      hint: "A single email address for a free-form invite, or a JSON array of recipient objects " +
        '(e.g. `[{"email":"signer@example.com","role_id":"...","role":"Signer 1","order":1}]`) ' +
        "for a role-based invite.",
    },
    { key: "from", label: "From", type: "string", hint: "Sender email address." },
    {
      key: "cc",
      label: "CC",
      type: "string",
      hint: "Comma-separated email addresses to CC once the document is completed.",
    },
    { key: "subject", label: "Subject", type: "string" },
    { key: "message", label: "Message", type: "text" },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    const trimmed = input.to.trim();
    let to: unknown;
    if (trimmed.startsWith("[")) {
      to = JSON.parse(trimmed);
      if (!Array.isArray(to)) throw new Error("`to` must be a JSON array for a role-based invite.");
    } else {
      to = trimmed;
    }
    const cc = input.cc ? input.cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    return new SignNowClient(ctx).request(
      `/document/${encodeURIComponent(input.documentId)}/invite`,
      {
        method: "POST",
        body: compact({
          to,
          from: input.from,
          cc,
          subject: input.subject,
          message: input.message,
        }),
      },
    );
  },
};

export default documentInviteCreate;
