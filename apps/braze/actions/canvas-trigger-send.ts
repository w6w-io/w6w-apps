import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /canvas/trigger/send` — verified against the fetched spec. Entry
 * point for an API-triggered Canvas. Not idempotent: re-sending enters the
 * audience into the Canvas again.
 */
const action: ActionDefinition = {
  key: "canvas-trigger-send",
  type: "perform",
  resource: "canvas",
  title: "Trigger Canvas Send",
  description: "Enter an audience into an API-triggered Canvas.",
  idempotent: false,
  params: [
    { key: "canvasId", label: "Canvas ID", type: "string", required: true },
    {
      key: "canvasEntryProperties",
      label: "Canvas Entry Properties",
      type: "json",
      hint: "Personalization values available at Canvas entry.",
    },
    { key: "broadcast", label: "Broadcast (no audience/recipients)", type: "boolean" },
    {
      key: "audience",
      label: "Audience Filter",
      type: "json",
      hint: "Braze connected-audience filter object (AND/OR of attribute/segment conditions).",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      hint: "Array of { external_user_id | user_alias, canvas_entry_properties? }.",
    },
  ],
  output: [
    { key: "dispatchId", type: "string", label: "Dispatch ID" },
  ],

  async execute(input, ctx) {
    const p = input as {
      canvasId: string;
      canvasEntryProperties?: unknown;
      broadcast?: boolean;
      audience?: unknown;
      recipients?: unknown;
    };
    ctx.log("info", "triggering Braze Canvas send", { canvasId: p.canvasId });
    return await new BrazeClient(ctx).post("/canvas/trigger/send", {
      canvas_id: p.canvasId,
      canvas_entry_properties: p.canvasEntryProperties ?? undefined,
      broadcast: p.broadcast ?? undefined,
      audience: p.audience ?? undefined,
      recipients: p.recipients ?? undefined,
    });
  },
};

export default action;
