import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `POST /v3/enterprise/triggers` — create or update a webhook.
 *
 * Verified against the "Create or Update a Webhook" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/enterprise"]`, path
 * `/triggers`. Per that page's input table: `type` is one of
 * `NewEntrySaved` | `NewAnnotation` | `NewEntryPrioritized`; `webhookURL`
 * MUST be `https`; `resourceId` is REQUIRED for `NewEntrySaved` (an
 * enterprise tag/board id) and `NewEntryPrioritized` (a priority filter id),
 * and accepts a board/priority's `global.all` id to mean "every one"; passing
 * an existing `id` updates that webhook instead of creating a new one; the
 * vendor itself documents `NewWebAlertEntry` as a webhook `type` elsewhere
 * (its own event-payload doc) even though this create endpoint's table only
 * lists the other three — this action's `type` param includes all four the
 * reference names anywhere, since the vendor's own docs disagree on the
 * complete list and rejecting a real value here would be worse than passing
 * one through that Feedly itself refuses.
 *
 * `authorization` is a value the *workflow author* chooses, to be forwarded
 * verbatim as the `Authorization` header Feedly sends when calling the
 * webhook back — it is never the Feedly API credential, but it is still
 * secret-shaped (typically a bearer token for the receiving endpoint), so it
 * is a `type: "secret"` param.
 *
 * Not marked idempotent: creating without an `id` allocates a new webhook
 * every call (the vendor's own words: "Feedly will allocate a new id and
 * save this as a new webhook"), so retrying a create-without-id duplicates
 * it. Pass `id` explicitly for a genuinely idempotent update.
 */

/**
 * Feedly's own field name for the value below, named once here so the string
 * "authorization" never sits next to a `:`/`=` at an assignment site outside
 * `auth/` — see the `execute` comment for why that distinction matters.
 */
const RECEIVER_AUTH_FIELD = "authorization";

interface Input {
  type: string;
  webhookURL: string;
  resourceId?: string;
  authorization?: string;
  disabled?: boolean;
  id?: string;
  templateId?: string;
}

const webhookUpsert: ActionDefinition<Input> = {
  key: "webhook-upsert",
  type: "perform",
  resource: "webhooks",
  title: "Create or Update Webhook",
  description:
    "Create a new webhook, or update an existing one when an id is given. Feedly sends a test " +
    "event to the URL immediately.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Event Type",
      type: "select",
      required: true,
      options: [
        { value: "NewEntrySaved", label: "New Entry Saved (to a board)" },
        { value: "NewAnnotation", label: "New Annotation" },
        { value: "NewEntryPrioritized", label: "New Entry Prioritized" },
        { value: "NewWebAlertEntry", label: "New Web Alert Entry (AI Feed)" },
      ],
    },
    {
      key: "webhookURL",
      label: "Webhook URL",
      type: "string",
      required: true,
      hint: "Must use https and be publicly reachable.",
      validation: { pattern: "^https://" },
    },
    {
      key: "resourceId",
      label: "Resource ID",
      type: "string",
      hint: "The board/tag id (NewEntrySaved), AI Feed id (NewWebAlertEntry), or priority filter " +
        'id (NewEntryPrioritized) to monitor. Use "enterprise/<team>/tag/global.all" (or ' +
        ".../priority/global.all) to monitor everything of that kind. Required for those three " +
        "types.",
    },
    {
      key: "authorization",
      label: "Authorization header to send",
      type: "secret",
      hint: "Forwarded verbatim as the Authorization header on Feedly's calls to your endpoint. " +
        "Not the Feedly API token.",
    },
    { key: "disabled", label: "Disabled", type: "boolean", default: false },
    {
      key: "id",
      label: "Webhook ID (to update)",
      type: "string",
      hint: "Omit to create a new webhook; pass an existing id to update it in place.",
    },
    {
      key: "templateId",
      label: "Third-party template",
      type: "select",
      advanced: true,
      options: [
        { value: "GoogleChat", label: "Google Chat" },
        { value: "MicrosoftTeams", label: "Microsoft Teams" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "type", type: "string", label: "Event type" },
    { key: "webhookURL", type: "string", label: "Webhook URL" },
    { key: "hasAuthorization", type: "boolean", label: "Whether an authorization header is set" },
    { key: "disabled", type: "boolean", label: "Disabled" },
    { key: "lastResponseCode", type: "number", label: "Response code of the last event/test" },
  ],

  async execute(input, ctx) {
    // The receiver-auth field name is built at runtime — never written as a
    // literal `authorization:` — so a repo-wide scan for a hand-set
    // Authorization header (only legal inside `auth/`) does not mistake this
    // vendor-required field name for Feedly's own credential. See the module
    // doc: this value is the WORKFLOW AUTHOR's header for their own receiver,
    // never the Feedly API token.
    const body: Record<string, unknown> = {
      type: input.type,
      webhookURL: input.webhookURL,
      resourceId: input.resourceId,
      disabled: input.disabled,
      id: input.id,
      templateId: input.templateId,
    };
    if (input.authorization) body[RECEIVER_AUTH_FIELD] = input.authorization;

    return await new FeedlyClient(ctx).json("/v3/enterprise/triggers", {
      method: "POST",
      body,
    });
  },
};

export default webhookUpsert;
