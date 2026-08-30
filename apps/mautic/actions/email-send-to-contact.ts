import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM, EMAIL_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /emails/{id}/contact/{contactId}/send` — verified against Mautic's
 * REST API docs (`emails.html`, "Send Email to Contact"). Sends immediately,
 * bypassing segment membership and Mautic's own send-frequency rules for that
 * campaign — the same as clicking "Send" from a contact's timeline in the UI.
 * `tokens` fills `{token_name}` placeholders in the email content.
 */
const action: ActionDefinition = {
  key: "email-send-to-contact",
  type: "perform",
  resource: "email",
  title: "Send an email to a contact",
  description: "Send a specific email to one contact, immediately.",
  // Calling this twice sends the email twice — Mautic does not dedupe a manual send.
  idempotent: false,
  params: [
    EMAIL_ID_PARAM,
    CONTACT_ID_PARAM,
    {
      key: "tokens",
      label: "Tokens (JSON)",
      type: "json",
      default: "",
      hint:
        'Associative array replacing `{token_name}` placeholders, e.g. {"{first_name}": "Jim"}.',
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emailId = Number(p.emailId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(emailId)) throw new Error("`emailId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    let tokens: unknown;
    if (p.tokens) {
      if (typeof p.tokens === "string") {
        try {
          tokens = JSON.parse(p.tokens);
        } catch {
          throw new Error("`tokens` is not valid JSON");
        }
      } else {
        tokens = p.tokens;
      }
    }

    ctx.log("info", "sending a Mautic email to a contact", { emailId, contactId });

    return await new MauticClient(ctx).request(`/emails/${emailId}/contact/${contactId}/send`, {
      method: "POST",
      body: tokens ? { tokens } : undefined,
    });
  },
};

export default action;
