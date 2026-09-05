import type { ActionDefinition } from "@w6w/types";
import { compact, csv, LearnWorldsClient } from "../lib/client.ts";

/**
 * `POST /v2/users` — create a new user. Returns the created User resource.
 *
 * `fields` covers the school's own custom sign-up fields, which this app
 * cannot enumerate in advance — same reasoning as `mautic`'s `otherFields` on
 * `contact-create`.
 */
interface Input {
  email: string;
  username: string;
  password?: string;
  tags?: string;
  sendRegistrationEmail?: boolean;
  subscribedForMarketingEmails?: boolean;
  isAdmin?: boolean;
  fields?: unknown;
}

function parseFields(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("`fields` is not valid JSON");
    }
  }
  return undefined;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create a User",
  description: "Create a new user in the school.",
  // Two calls with the same email create two error responses, not two users
  // (LearnWorlds rejects a duplicate email) — but it is not safe to retry
  // blindly, since a transient failure after the user was actually created
  // would surface as a duplicate-email error rather than a clean success.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "username", label: "Username", type: "string", required: true },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Leave empty to let the user set one at first sign-in.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names to apply.",
    },
    {
      key: "sendRegistrationEmail",
      label: "Send registration email",
      type: "boolean",
      hint: "Whether the user receives LearnWorlds' registration email.",
    },
    {
      key: "subscribedForMarketingEmails",
      label: "Subscribed for marketing emails",
      type: "boolean",
    },
    { key: "isAdmin", label: "Is admin", type: "boolean", default: false },
    {
      key: "fields",
      label: "Profile fields (JSON)",
      type: "json",
      hint: 'Default or custom sign-up fields, e.g. {"bio": "…", "country": "GR"}.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating a LearnWorlds user", { email: input.email });

    const body = compact({
      email: input.email,
      username: input.username,
      password: input.password,
      tags: csv(input.tags),
      send_registration_email: input.sendRegistrationEmail,
      subscribed_for_marketing_emails: input.subscribedForMarketingEmails,
      is_admin: input.isAdmin,
      fields: parseFields(input.fields),
    });

    return await new LearnWorldsClient(ctx).request("/v2/users", {
      method: "POST",
      body,
    });
  },
};

export default userCreate;
