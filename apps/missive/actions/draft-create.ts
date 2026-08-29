import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";
import { ATTACHMENTS_PARAM, CONVERSATION_ROUTING_PARAMS, routingFields } from "../lib/params.ts";

interface Input {
  subject?: string;
  body?: string;
  fromField?: unknown;
  toFields?: unknown;
  ccFields?: unknown;
  bccFields?: unknown;
  account?: string;
  attachments?: unknown;
  quotePreviousMessage?: boolean;
  addDefaultSignature?: boolean;
  send?: boolean;
  sendAt?: number;
  autoFollowup?: boolean;
  externalResponseId?: string;
  externalResponseVariables?: unknown;
  conversation?: string;
  references?: string;
  conversationSubject?: string;
  conversationColor?: string;
  organization?: string;
  team?: string;
  forceTeam?: boolean;
  addUsers?: string;
  addAssignees?: string;
  removeAssignees?: string;
  addSharedLabels?: string;
  removeSharedLabels?: string;
  addToInbox?: boolean;
  addToTeamInbox?: boolean;
  close?: boolean;
}

/**
 * `POST /v1/drafts` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Drafts, 2026-08-29.
 *
 * **This is the endpoint Missive documents for sending email, SMS, WhatsApp
 * and Live Chat messages** — set Send to true to send immediately rather than
 * leaving an editable draft. Reply into an existing conversation with
 * Conversation ID or References; omit both to start a new one.
 *
 * `fromField`/`toFields`/`ccFields`/`bccFields` are channel-shaped objects
 * (`{"address","name"}` for email, `{"phone_number"}` for SMS/WhatsApp,
 * `{"id","username","name"}` for a custom channel or Missive Live Chat) —
 * accepted as JSON rather than flattened, since the required keys differ per
 * channel.
 *
 * Sending fires any matching outgoing-message rules, including scheduled
 * auto-follow-ups — see Missive's "Automated email sequences" use case.
 *
 * The reference shows a request payload for this endpoint but no matching
 * response example (unlike, say, Create Contact), so the output below is left
 * as a single opaque object rather than a guessed field list.
 */
const action: ActionDefinition<Input> = {
  key: "draft-create",
  type: "perform",
  resource: "draft",
  title: "Create Draft (or Send a Message)",
  description:
    "Create a draft — or, with Send enabled, send it immediately — as an email, SMS, WhatsApp, " +
    "or Missive Live Chat message. Append to an existing conversation with Conversation ID or " +
    "References, or start a new one.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", default: "" },
    {
      key: "body",
      label: "Body",
      type: "text",
      default: "",
      hint: "HTML or plain text. Use <div>…</div><div><br></div> between paragraphs for " +
        "correct spacing — plain <p> tags render flat in Missive. Avoid hard-coded text colors " +
        "so dark mode still works.",
    },
    {
      key: "fromField",
      label: "From (JSON)",
      type: "json",
      default: "",
      hint: 'Email: {"address":"you@acme.com","name":"You"}. SMS/WhatsApp: ' +
        '{"phone_number":"+18005550199"}. Must match one of your aliases or connected numbers.',
    },
    {
      key: "toFields",
      label: "To (JSON array)",
      type: "json",
      default: "",
      hint: 'Email: [{"address":"paul@acme.com"}]. SMS/WhatsApp: [{"phone_number":"+1…"}] ' +
        "(one item only).",
    },
    { key: "ccFields", label: "Cc (JSON array)", type: "json", default: "", advanced: true },
    { key: "bccFields", label: "Bcc (JSON array)", type: "json", default: "", advanced: true },
    {
      key: "account",
      label: "Account ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Required for custom channels, Missive Live Chat, Messenger, and Instagram.",
    },
    ATTACHMENTS_PARAM,
    {
      key: "quotePreviousMessage",
      label: "Quote Previous Message",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "⚠️ Includes the previous message's body in this draft — only use when you control " +
        "and can see the conversation's content, to avoid leaking anything sensitive.",
    },
    {
      key: "addDefaultSignature",
      label: "Add Default Signature",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Email only, and only when the From alias has a signature configured.",
    },
    {
      key: "send",
      label: "Send Immediately",
      type: "boolean",
      default: false,
      hint: "Sends now instead of leaving an editable draft. Triggers matching outgoing rules.",
    },
    {
      key: "sendAt",
      label: "Send At (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Schedule for later. Cannot be combined with Send Immediately.",
    },
    {
      key: "autoFollowup",
      label: "Auto Follow-up",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "With Send At: discard the scheduled send if the conversation gets a reply first.",
    },
    {
      key: "externalResponseId",
      label: "WhatsApp Template ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "The Twilio or Meta template ID. Required to initiate a WhatsApp conversation with " +
        "someone you haven't messaged in the last 24 hours. Body must match the rendered " +
        "template.",
    },
    {
      key: "externalResponseVariables",
      label: "WhatsApp Template Variables (JSON)",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. {"1":"Philippe","2":"This project"}. String keys matching the template\'s ' +
        "{{1}}, {{2}}… placeholders.",
    },
    ...CONVERSATION_ROUTING_PARAMS,
  ],
  output: [
    { key: "drafts", type: "object", label: "Response body — shape undocumented by Missive" },
  ],

  async execute(input, ctx) {
    if (input.send === true && input.sendAt) {
      throw new Error("`send` and `sendAt` cannot be combined");
    }

    const draft = {
      ...compact({
        subject: input.subject,
        body: input.body,
        account: input.account,
        quote_previous_message: input.quotePreviousMessage === true ? true : undefined,
        add_default_signature: input.addDefaultSignature === true ? true : undefined,
        send: input.send === true ? true : undefined,
        send_at: input.sendAt,
        auto_followup: input.autoFollowup === true ? true : undefined,
        external_response_id: input.externalResponseId,
      }),
      ...compact({
        from_field: asOptionalJson(input.fromField, "fromField"),
        to_fields: asOptionalJson(input.toFields, "toFields"),
        cc_fields: asOptionalJson(input.ccFields, "ccFields"),
        bcc_fields: asOptionalJson(input.bccFields, "bccFields"),
        attachments: asOptionalJson(input.attachments, "attachments"),
        external_response_variables: asOptionalJson(
          input.externalResponseVariables,
          "externalResponseVariables",
        ),
      }),
      ...routingFields(input as unknown as Record<string, unknown>),
    };

    ctx.log("info", "creating Missive draft", { send: input.send === true });
    return await new MissiveClient(ctx).json("/drafts", {
      method: "POST",
      body: { drafts: draft },
    });
  },
};

export default action;
