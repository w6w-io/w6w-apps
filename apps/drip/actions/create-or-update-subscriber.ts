import type { ActionDefinition } from "@w6w/types";
import { compact, DripClient, jsonObject, unset } from "../lib/client.ts";

interface Input {
  email: string;
  newEmail?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  timeZone?: string;
  status?: string;
  tags?: string;
  removeTags?: string;
  customFields?: unknown;
}

const csv = (v: string | undefined): string[] | undefined => {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
};

/**
 * `POST /v2/:account_id/subscribers` — upsert by email/id/visitor_uuid.
 * Repeating the same call with the same fields converges on the same
 * subscriber state, so this is honestly idempotent.
 */
const createOrUpdateSubscriber: ActionDefinition<Input> = {
  key: "create-or-update-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Create or Update Subscriber",
  description: "Create a subscriber, or update one that already exists, keyed by email.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "newEmail",
      label: "New email",
      type: "string",
      hint: "Renames the subscriber's email address.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      hint: "Olson format, e.g. America/Los_Angeles. Defaults to Etc/UTC.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Unsubscribed", value: "unsubscribed" },
      ],
    },
    {
      key: "tags",
      label: "Tags to add",
      type: "string",
      hint: "Comma-separated, e.g. Customer, SEO.",
    },
    {
      key: "removeTags",
      label: "Tags to remove",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: '{ "shirt_size": "Medium" }',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<
      { subscribers?: Array<Record<string, unknown>> }
    >(
      "/subscribers",
      {
        method: "POST",
        body: {
          subscribers: [
            compact({
              email: input.email,
              new_email: unset(input.newEmail),
              first_name: unset(input.firstName),
              last_name: unset(input.lastName),
              phone: unset(input.phone),
              time_zone: unset(input.timeZone),
              status: unset(input.status),
              tags: csv(input.tags),
              remove_tags: csv(input.removeTags),
              custom_fields: jsonObject(input.customFields, "customFields"),
            }),
          ],
        },
      },
    );
    return body.subscribers?.[0] ?? {};
  },
};

export default createOrUpdateSubscriber;
