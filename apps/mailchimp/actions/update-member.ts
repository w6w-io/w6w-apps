import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";
import { subscriberHash } from "../lib/subscriber-hash.ts";

type Status = "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";

interface Input {
  listId: string;
  email: string;
  status?: Status;
  emailType?: "html" | "text";
  language?: string;
  vip?: boolean;
  ipSignup?: string;
  ipOptIn?: string;
  timestampSignup?: string;
  timestampOpt?: string;
  location?: { latitude?: number; longitude?: number };
  mergeFields?: Record<string, unknown>;
  interests?: Record<string, boolean>;
  skipMergeValidation?: boolean;
}

interface Body {
  email_address: string;
  status?: Status;
  email_type?: string;
  language?: string;
  vip?: boolean;
  location?: { latitude?: number; longitude?: number };
  ip_signup?: string;
  timestamp_signup?: string;
  ip_opt?: string;
  timestamp_opt?: string;
  merge_fields?: Record<string, unknown>;
  interests?: Record<string, boolean>;
}

/**
 * Update an existing subscriber. Uses PUT (Mailchimp's "add or update" verb):
 * every field is optional and only the ones we send are patched. Mailchimp's
 * `skip_merge_validation` is a query-string flag, not a body field.
 */
const updateMember: ActionDefinition<Input> = {
  key: "update-member",
  type: "perform",
  resource: "member",
  title: "Update Member",
  description: "Update an existing subscriber (PUT — creates if missing).",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "cleaned", label: "Cleaned" },
        { value: "pending", label: "Pending" },
        { value: "transactional", label: "Transactional" },
      ],
    },
    {
      key: "emailType",
      label: "Email type",
      type: "select",
      options: [
        { value: "html", label: "HTML" },
        { value: "text", label: "Text" },
      ],
    },
    { key: "language", label: "Language", type: "string" },
    { key: "vip", label: "VIP", type: "boolean" },
    { key: "ipSignup", label: "Signup IP", type: "string" },
    { key: "ipOptIn", label: "Opt-in IP", type: "string" },
    { key: "timestampSignup", label: "Signup timestamp (ISO 8601)", type: "string" },
    { key: "timestampOpt", label: "Opt-in timestamp (ISO 8601)", type: "string" },
    { key: "location", label: "Location {latitude, longitude}", type: "json" },
    { key: "mergeFields", label: "Merge fields", type: "json" },
    { key: "interests", label: "Interests (id → boolean)", type: "json" },
    { key: "skipMergeValidation", label: "Skip merge validation", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    const hash = subscriberHash(input.email);
    const body: Body = { email_address: input.email };
    if (input.status) body.status = input.status;
    if (input.emailType) body.email_type = input.emailType;
    if (input.language) body.language = input.language;
    if (input.vip !== undefined) body.vip = input.vip;
    if (input.ipSignup) body.ip_signup = input.ipSignup;
    if (input.ipOptIn) body.ip_opt = input.ipOptIn;
    if (input.timestampSignup) body.timestamp_signup = input.timestampSignup;
    if (input.timestampOpt) body.timestamp_opt = input.timestampOpt;
    if (input.location) body.location = input.location;
    if (input.mergeFields) body.merge_fields = input.mergeFields;
    if (input.interests) body.interests = input.interests;

    return client.request(`/lists/${input.listId}/members/${hash}`, {
      method: "PUT",
      body,
      query: {
        skip_merge_validation: input.skipMergeValidation,
      },
    });
  },
};

export default updateMember;
