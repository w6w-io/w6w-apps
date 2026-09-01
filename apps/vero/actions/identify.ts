import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonParam, request } from "../lib/client.ts";

/**
 * `POST /users/track` — creates a user profile if it doesn't exist yet, or
 * updates it based on the properties provided. Verified 2026-09-01 against
 * Vero's OpenAPI schema embedded in help.getvero.com/api-reference/users/
 * identify (`originalFileLocation: "api-reference/track/track.yml"`) and the
 * Getting Started guide, which documents `id` and `email` as both required
 * when identifying a user.
 *
 * `preferences.topics` (per-topic subscribe/unsubscribe against a
 * preference-center Topic) is part of this endpoint's request schema but is
 * left out here: resolving a topic needs the Topics resource, which lives on
 * Vero's Campaigns API — a gated public-preview surface this app does not
 * implement (see README).
 *
 * `idempotent: true` — a POST with the same id/email/data is a pure upsert.
 * Vero also compares `extras.created_at` against when each property was last
 * updated and rejects an out-of-order (stale) change, so a delayed retry
 * cannot regress newer data with older data.
 */
const identify: ActionDefinition = {
  key: "identify",
  type: "perform",
  resource: "person",
  title: "Identify User",
  description: "Create a user profile, or update it if it already exists (upsert).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The user's unique identifier.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The user's email address.",
    },
    {
      key: "channels",
      label: "Channels",
      type: "json",
      hint: 'Push device tokens, e.g. [{ "type": "push", "address": "TOKEN", "platform": ' +
        '"android" }].',
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      hint: 'Free-form profile properties, e.g. { "first_name": "Ada", "timezone": -7 }.',
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "string",
      advanced: true,
      hint: "ISO 8601 timestamp or unix epoch. Vero rejects a change older than the data it " +
        "already has for a property; omit to use the time the request is received.",
    },
    {
      key: "updateOnly",
      label: "Update only",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Update the profile if it exists, but do not create a new one if it doesn't.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Accepted by Vero" },
    { key: "message", type: "string", label: "Vero's response message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.trim() : "";
    if (!id) throw new Error("`id` is required");
    const email = typeof p.email === "string" ? p.email.trim() : "";
    if (!email) throw new Error("`email` is required");

    const channels = parseJsonParam(p.channels);
    const data = parseJsonParam(p.data);
    const extras = compact({
      created_at: typeof p.createdAt === "string" && p.createdAt ? p.createdAt : undefined,
      update_only: p.updateOnly === true ? "true" : undefined,
    });

    const body = compact({
      id,
      email,
      channels,
      data,
      extras: Object.keys(extras).length ? extras : undefined,
    });

    ctx.log("info", "Vero identify", { id });
    return await request(ctx, "POST", "/users/track", body);
  },
};

export default identify;
