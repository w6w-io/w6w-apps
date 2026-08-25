import type { ActionDefinition } from "@w6w/types";
import { compact, SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `POST /link` — creates a public signing link for a document: anyone with
 * the URL can sign it, with no invite and no per-signer tracking. SignNow
 * returns two variants: `url` requires the signer to create a SignNow
 * account first, `url_no_signup` does not.
 */
const signingLinkCreate: ActionDefinition<Input> = {
  key: "signing-link-create",
  type: "perform",
  resource: "signing-link",
  title: "Create Signing Link",
  description: "Create a public signing link for a document, with and without signup required.",
  idempotent: false,
  params: [documentIdParam],
  output: [
    { key: "url", type: "string", label: "Signing URL (requires SignNow signup)" },
    { key: "url_no_signup", type: "string", label: "Signing URL (no signup required)" },
  ],

  execute(input, ctx) {
    return new SignNowClient(ctx).request("/link", {
      method: "POST",
      body: compact({ document_id: input.documentId }),
    });
  },
};

export default signingLinkCreate;
