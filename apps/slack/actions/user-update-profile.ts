import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface CustomField {
  id: string;
  value: string;
  alt?: string;
}

interface Input {
  user?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  statusText?: string;
  statusEmoji?: string;
  statusExpiration?: string;
  customFields?: CustomField[];
}

const userUpdateProfile: ActionDefinition<Input> = {
  key: "user-update-profile",
  type: "perform",
  resource: "user",
  title: "Update User Profile",
  description: "Updates the authenticated user's (or an admin-specified user's) profile (users.profile.set).",
  params: [
    { key: "user", label: "User ID", type: "string", hint: "Admin-only. Defaults to caller." },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "statusText", label: "Status text", type: "string" },
    { key: "statusEmoji", label: "Status emoji", type: "string" },
    {
      key: "statusExpiration",
      label: "Status expiration",
      type: "datetime",
      hint: "ISO datetime; converted to Unix seconds. Empty = no expiry.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "group",
      repeat: true,
      children: [
        { key: "id", label: "Field ID", type: "string", required: true },
        { key: "value", label: "Value", type: "string", required: true },
        { key: "alt", label: "Alt text", type: "string" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const profile: Record<string, unknown> = {};
    if (input.firstName !== undefined) profile.first_name = input.firstName;
    if (input.lastName !== undefined) profile.last_name = input.lastName;
    if (input.email !== undefined) profile.email = input.email;
    if (input.phone !== undefined) profile.phone = input.phone;
    if (input.title !== undefined) profile.title = input.title;
    if (input.statusText !== undefined) profile.status_text = input.statusText;
    if (input.statusEmoji !== undefined) profile.status_emoji = input.statusEmoji;
    profile.status_expiration = input.statusExpiration
      ? Math.floor(new Date(input.statusExpiration).getTime() / 1000)
      : 0;
    if (input.customFields && input.customFields.length > 0) {
      const fields: Record<string, { value: string; alt?: string }> = {};
      for (const f of input.customFields) {
        fields[f.id] = { value: f.value, alt: f.alt };
      }
      profile.fields = fields;
    }

    const body: Record<string, unknown> = { profile };
    if (input.user) body.user = input.user;

    const res = await client.request<{ profile?: unknown }>("/users.profile.set", {
      method: "POST",
      body,
    });
    return res.profile ?? res;
  },
};

export default userUpdateProfile;
