import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

type Status = "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";

interface Input {
  listId: string;
  email: string;
  status: Status;
  emailType?: "html" | "text";
  language?: string;
  vip?: boolean;
  ipSignup?: string;
  ipOptIn?: string;
  timestampSignup?: string;
  timestampOpt?: string;
  tags?: string[];
  location?: { latitude?: number; longitude?: number };
  mergeFields?: Record<string, unknown>;
  interests?: Record<string, boolean>;
}

interface Body {
  email_address: string;
  status: Status;
  email_type?: string;
  language?: string;
  vip?: boolean;
  location?: { latitude?: number; longitude?: number };
  ip_signup?: string;
  timestamp_signup?: string;
  ip_opt?: string;
  timestamp_opt?: string;
  tags?: string[];
  merge_fields?: Record<string, unknown>;
  interests?: Record<string, boolean>;
}

/**
 * Add a member to a Mailchimp list. Maps directly to n8n's `member:create`.
 * Merge fields / interests / location are optional; when omitted we don't send
 * them (Mailchimp treats missing keys as "no change").
 */
const createMember: ActionDefinition<Input> = {
  key: "create-member",
  type: "perform",
  resource: "member",
  title: "Create Member",
  description: "Add a subscriber to a list (audience).",
  idempotent: false,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
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
    { key: "vip", label: "VIP", type: "boolean", default: false },
    { key: "ipSignup", label: "Signup IP", type: "string" },
    { key: "ipOptIn", label: "Opt-in IP", type: "string" },
    { key: "timestampSignup", label: "Signup timestamp (ISO 8601)", type: "string" },
    { key: "timestampOpt", label: "Opt-in timestamp (ISO 8601)", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      repeat: true,
      hint: "Tag names to attach.",
    },
    { key: "location", label: "Location {latitude, longitude}", type: "json" },
    { key: "mergeFields", label: "Merge fields", type: "json" },
    { key: "interests", label: "Interests (id → boolean)", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    const body: Body = {
      email_address: input.email,
      status: input.status,
    };
    if (input.emailType) body.email_type = input.emailType;
    if (input.language) body.language = input.language;
    if (input.vip !== undefined) body.vip = input.vip;
    if (input.ipSignup) body.ip_signup = input.ipSignup;
    if (input.ipOptIn) body.ip_opt = input.ipOptIn;
    if (input.timestampSignup) body.timestamp_signup = input.timestampSignup;
    if (input.timestampOpt) body.timestamp_opt = input.timestampOpt;
    if (input.tags && input.tags.length) body.tags = input.tags;
    if (input.location) body.location = input.location;
    if (input.mergeFields) body.merge_fields = input.mergeFields;
    if (input.interests) body.interests = input.interests;

    return client.request(`/lists/${input.listId}/members`, {
      method: "POST",
      body,
    });
  },
};

export default createMember;
