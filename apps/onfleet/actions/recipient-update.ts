import type { ActionDefinition } from "@w6w/types";
import { compact, json, OnfleetClient } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

/**
 * `PUT /recipients/:id` — update a recipient's name, notes, SMS setting or
 * metadata.
 *
 * **`phone` cannot be changed** — it is the recipient's unique identifier.
 * Create a new recipient instead if the phone number itself changed.
 */
const action: ActionDefinition = {
  key: "recipient-update",
  type: "perform",
  resource: "recipient",
  title: "Update recipient",
  description: "Update a recipient's name, notes, SMS setting or metadata. `phone` cannot " +
    "change — create a new recipient instead.",
  idempotent: true,
  params: [
    { key: "recipientId", label: "Recipient ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "notes", label: "Notes", type: "text", default: "" },
    {
      key: "skipSMSNotifications",
      label: "Skip SMS notifications",
      type: "boolean",
      default: "",
    },
    metadataParam,
  ],
  output: [{ key: "id", type: "string", label: "Recipient ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { recipientId } = p as { recipientId: string };
    if (!recipientId) throw new Error("`recipientId` is required");

    const body = compact({
      name: p.name,
      notes: p.notes,
      skipSMSNotifications: typeof p.skipSMSNotifications === "boolean"
        ? p.skipSMSNotifications
        : undefined,
      metadata: json(p.metadata, "metadata"),
    });
    if (Object.keys(body).length === 0) throw new Error("no fields to update were provided");

    return await new OnfleetClient(ctx).request(`/recipients/${encodeURIComponent(recipientId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
