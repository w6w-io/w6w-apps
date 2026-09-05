import type { OutputField, Param } from "@w6w/types";

/** Shared `documentId` param — the 36-character document uuid. */
export const documentIdParam: Param = {
  key: "documentId",
  label: "Document ID",
  type: "string",
  required: true,
  hint: "The document uuid (from Create Document, List Documents, or a previous action's output).",
};

/** Shared `signrequestId` param — the 36-character SignRequest uuid. */
export const signrequestIdParam: Param = {
  key: "signrequestId",
  label: "SignRequest ID",
  type: "string",
  required: true,
  hint: "The SignRequest uuid (from Create SignRequest, List SignRequests, or a webhook payload).",
};

/** Shared pagination params — SignRequest paginates by `page` NUMBER, not `offset`. */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "1-based page number. Omit for the first page.",
};

export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  hint: "Number of results per page.",
};

/** The document summary fields this app surfaces. Not exhaustive — see the action docs. */
export const documentSummaryOutput: OutputField[] = [
  { key: "uuid", type: "string", label: "Document ID" },
  { key: "url", type: "string", label: "Document resource URL" },
  { key: "name", type: "string", label: "Name" },
  { key: "external_id", type: "string", label: "External ID" },
  { key: "status", type: "string", label: "Status code (see Document status codes)" },
  { key: "file", type: "string", label: "Temporary URL to the original file (5-minute expiry)" },
  { key: "pdf", type: "string", label: "Temporary URL to the signed PDF (5-minute expiry)" },
  { key: "processing", type: "boolean", label: "Change is still processing" },
  { key: "sandbox", type: "boolean", label: "Created under a sandbox team" },
];

/** The SignRequest summary fields this app surfaces. Not exhaustive. */
export const signrequestSummaryOutput: OutputField[] = [
  { key: "uuid", type: "string", label: "SignRequest ID" },
  { key: "url", type: "string", label: "SignRequest resource URL" },
  { key: "document", type: "string", label: "Document resource URL" },
  { key: "who", type: "string", label: "`m`: only me, `mo`: me and others, `o`: only others" },
];

/** `WebhookSubscription.event_type` — the full vocabulary of events a webhook can subscribe to. */
export const WEBHOOK_EVENT_TYPES = [
  "convert_error",
  "converted",
  "sending_error",
  "sent",
  "declined",
  "cancelled",
  "expired",
  "signed",
  "viewed",
  "downloaded",
  "signer_signed",
  "signer_email_bounced",
  "signer_viewed_email",
  "signer_viewed",
  "signer_forwarded",
  "signer_downloaded",
  "signrequest_received",
  "login_failed",
  "login_successful",
  "password_reset_request_sent",
  "password_reset_request_error",
] as const;

/** SignRequest's document-status vocabulary (`Document.status`), spelled out for hints/docs. */
export const DOCUMENT_STATUS_HINT =
  "`co`: converting, `ne`: new, `se`: sent, `vi`: viewed, `si`: signed, `do`: downloaded, " +
  "`sd`: signed and downloaded, `ca`: cancelled, `de`: declined, `ec`: error converting, " +
  "`es`: error sending, `xp`: expired";
