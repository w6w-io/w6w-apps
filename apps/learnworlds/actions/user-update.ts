import type { ActionDefinition } from "@w6w/types";
import { compact, LearnWorldsClient } from "../lib/client.ts";

/**
 * `PUT /v2/users/{id}` — update an existing user. Applying the same values
 * twice leaves the user in the same state, so this is safe to mark
 * idempotent, unlike `user-create`.
 */
interface Input {
  id: string;
  email?: string;
  username?: string;
  isAdmin?: boolean;
  subscribedForMarketingEmails?: boolean;
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

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update a User",
  description: "Update an existing user's information.",
  idempotent: true,
  params: [
    { key: "id", label: "User ID or email", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "username", label: "Username", type: "string" },
    { key: "isAdmin", label: "Is admin", type: "boolean" },
    {
      key: "subscribedForMarketingEmails",
      label: "Subscribed for marketing emails",
      type: "boolean",
    },
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
    ctx.log("info", "updating a LearnWorlds user", { id: input.id });

    const body = compact({
      email: input.email,
      username: input.username,
      is_admin: input.isAdmin,
      subscribed_for_marketing_emails: input.subscribedForMarketingEmails,
      fields: parseFields(input.fields),
    });

    return await new LearnWorldsClient(ctx).request(
      `/v2/users/${encodeURIComponent(input.id)}`,
      { method: "PUT", body },
    );
  },
};

export default userUpdate;
