import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson, encodeEmailContent, toIdList } from "../lib/params.ts";

/**
 * `POST /rest/v2/emails:send` — Send an Email to contacts.
 *
 * Three things about this endpoint are not what they look like.
 *
 * ## 1. The bodies must be Base64, and sending raw HTML does not error
 *
 * Keap declares `html_content` as "The HTML-formatted content of the email,
 * **encoded in Base64**", with the example `PGgxPldlbGNvbWU8L2gxPg==`
 * (`<h1>Welcome</h1>`). Same for `plain_content` and for every attachment's
 * `file_data`. Post raw markup and the request succeeds — the recipient just
 * gets the literal `<h1>Welcome</h1>` as text. This action encodes for you, and
 * leaves already-encoded content alone (see `encodeEmailContent`).
 *
 * ## 2. It answers 202 with no body
 *
 * The only success response Keap declares is `202 Accepted` with **no content**
 * at all — no message id, no per-recipient result. The mail is queued, not
 * sent, and there is nothing to correlate a later delivery against. A caller
 * expecting an id back gets `undefined`; a caller that parses the body gets a
 * JSON error. Use `GET /rest/v2/emails` (List Emails) filtered by contact to
 * see what was recorded.
 *
 * ## 3. Exactly one of `user_id` and `from_address` — never both, never neither
 *
 * Keap states it on both properties: "Exactly one of `user_id` or
 * `from_address` is required." And `from_address` must be an *authenticated*
 * sender address on the Keap account, not an arbitrary one.
 *
 * `address_field` selects which of the recipient's email slots to send to —
 * `EMAIL1`, `EMAIL2`, `EMAIL3` or a custom field — which matters because a
 * contact with three addresses gets the primary one unless told otherwise.
 * Attachments are capped at 10 of 1 MB each, and only the extensions Keap
 * allowlists are accepted (anything else is a 400 reading "attachment type is
 * invalid").
 */
interface Input {
  contactIds: string;
  subject: string;
  htmlContent?: string;
  plainContent?: string;
  userId?: string;
  fromAddress?: string;
  addressField?: string;
  attachments?: unknown;
}

const emailSend: ActionDefinition<Input> = {
  key: "email-send",
  type: "perform",
  title: "Send Email",
  resource: "email",
  description: "Queue a one-off email to a batch of contacts, from a Keap user or a verified " +
    "sender address.",
  // Keap accepts no idempotency key here and returns nothing to correlate
  // against, so a retry sends the mail twice.
  idempotent: false,
  params: [
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "string",
      required: true,
      placeholder: "123,456",
      hint: "Comma-separated. Keap addresses each copy to the contact's own email slot.",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "htmlContent",
      label: "HTML body",
      type: "text",
      hint: "Written as plain HTML — it is Base64-encoded for you before sending, which Keap " +
        "requires. Already-encoded content is passed through unchanged.",
    },
    { key: "plainContent", label: "Plain-text body", type: "text" },
    {
      key: "userId",
      label: "Send as user ID",
      type: "string",
      row: "sender",
      hint: "Supply this or the sender address, never both.",
    },
    {
      key: "fromAddress",
      label: "Send from address",
      type: "string",
      row: "sender",
      hint: "Must already be an authenticated sender on the Keap account.",
    },
    {
      key: "addressField",
      label: "Recipient email slot",
      type: "string",
      advanced: true,
      placeholder: "EMAIL1",
      hint: "Which of the contact's email fields to address — EMAIL1, EMAIL2, EMAIL3 or a " +
        "custom field name. Defaults to the contact's primary address.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      advanced: true,
      hint: 'Array of `{"file_name": "x.pdf", "file_data": "<base64>"}`. Maximum 10, 1 MB each. ' +
        'Keap allowlists extensions and rejects anything else with "attachment type is ' +
        'invalid".',
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "queued", type: "boolean", label: "Accepted for delivery" },
    { key: "recipients", type: "array", label: "Contact IDs submitted" },
  ],

  async execute(input, ctx) {
    const contacts = toIdList(input.contactIds);
    if (contacts.length === 0) throw new Error("At least one contact ID is required.");

    const hasUser = Boolean(input.userId);
    const hasFrom = Boolean(input.fromAddress);
    if (hasUser === hasFrom) {
      throw new Error(
        "Keap requires exactly one sender: supply either Send as user ID or Send from address, " +
          "not both and not neither.",
      );
    }

    const attachments = asOptionalJson<unknown[]>(input.attachments, "Attachments");
    if (Array.isArray(attachments) && attachments.length > 10) {
      throw new Error(`Keap accepts at most 10 attachments; ${attachments.length} were supplied.`);
    }

    const body = compact({
      contacts,
      subject: input.subject,
      // Base64, because Keap says so and because the failure is silent.
      html_content: encodeEmailContent(input.htmlContent),
      plain_content: encodeEmailContent(input.plainContent),
      user_id: input.userId,
      from_address: input.fromAddress,
      address_field: input.addressField,
      attachments,
    });

    const client = new KeapClient(ctx);
    const status = await client.status(`${V2}/emails:send`, { method: "POST", body });
    ctx.log("info", "queued email", { recipients: contacts.length, status });
    // 202 with no body is the documented success. There is no id to return.
    return { status, queued: status === 202 || status === 200, recipients: contacts };
  },
};

export default emailSend;
