import type { ActionDefinition } from "@w6w/types";
import { expectSuccess, sendyPost, SUBSCRIBE_PATH } from "../lib/client.ts";

interface Input {
  email: string;
  listId: string;
  name?: string;
  country?: string;
  ipAddress?: string;
  referrer?: string;
  gdpr?: boolean;
  silent?: boolean;
  customFields?: Record<string, unknown>;
}

/**
 * `POST /subscribe` — adds a subscriber to a list, or updates one that
 * already exists (so retrying is safe: `idempotent: true`).
 *
 * Always sent with `boolean=true`, which Sendy documents as switching the
 * response to a fixed plain-text shape (`"true"` on success). Without it the
 * documented response is the same set of strings, just less consistently —
 * forcing it removes an axis of guessing.
 *
 * Custom field values are passed as extra form fields keyed by the field's
 * own personalization tag (Sendy's convention, not this app's) — `customFields`
 * merges them in verbatim rather than this app trying to enumerate every
 * tag a Sendy installation could have.
 */
const subscriberSubscribe: ActionDefinition<Input> = {
  key: "subscriber-subscribe",
  type: "perform",
  resource: "subscriber",
  title: "Subscribe",
  description: "Add a subscriber to a list, or update one that's already on it.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The encrypted & hashed list id, from View all lists.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "2-letter country code.",
    },
    { key: "ipAddress", label: "IP Address", type: "string" },
    { key: "referrer", label: "Referrer URL", type: "string" },
    {
      key: "gdpr",
      label: "GDPR consent",
      type: "boolean",
      hint: "Set when signing up EU users in a GDPR-compliant manner.",
    },
    {
      key: "silent",
      label: "Bypass double opt-in",
      type: "boolean",
      hint: "For a 'Double opt-in' list, signs the subscriber up as single opt-in instead.",
    },
    {
      key: "customFields",
      label: "Custom Fields",
      type: "json",
      hint:
        'JSON object keyed by the custom field\'s personalization tag, e.g. `{"Birthday": "1990-01-01"}`.',
    },
  ],
  output: [{ key: "subscribed", type: "boolean", label: "Subscribed" }],

  async execute(input, ctx) {
    ctx.log("info", "subscribing", { list: input.listId });
    const customFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.customFields ?? {})) {
      if (v === undefined || v === null) continue;
      customFields[k] = String(v);
    }
    const text = await sendyPost(ctx, SUBSCRIBE_PATH, {
      name: input.name,
      email: input.email,
      list: input.listId,
      country: input.country,
      ipaddress: input.ipAddress,
      referrer: input.referrer,
      gdpr: input.gdpr ? "true" : undefined,
      silent: input.silent ? "true" : undefined,
      boolean: "true",
      ...customFields,
    });
    expectSuccess(SUBSCRIBE_PATH, text, ["true"]);
    return { subscribed: true };
  },
};

export default subscriberSubscribe;
