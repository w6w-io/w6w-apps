import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, stripSecrets, VapiClient } from "../lib/client.ts";

/**
 * `POST /call` — start a call.
 *
 * Vapi can start a call against an Assistant, a Squad, or a Workflow — this
 * action covers the by-id form of all three (`assistantId`/`squadId`/
 * `workflowId`), not the transient inline-config forms (`assistant`/`squad`/
 * `workflow`), for the same reason `assistant-create` does not exist in this
 * app: those bodies are the same deeply nested, polymorphic config object.
 * Provide exactly one of the three ids.
 *
 * Omit `phoneNumberId` and `customerNumber` to start a **web call** (no
 * telephony leg) — both are only relevant for `outboundPhoneCall`/
 * `inboundPhoneCall`.
 *
 * A `201` can answer either a single `Call` or, when `customers` batches
 * several recipients, a `CallBatchResponse` — this action only ever sends one
 * customer, so it always gets the single-`Call` shape back.
 */
interface Input {
  assistantId?: string;
  squadId?: string;
  workflowId?: string;
  phoneNumberId?: string;
  customerNumber?: string;
  customerName?: string;
  name?: string;
  assistantOverrides?: unknown;
}

const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Create Call",
  description: "Start a call (web or phone) against an existing Assistant, Squad or Workflow.",
  idempotent: false,
  params: [
    {
      key: "assistantId",
      label: "Assistant ID",
      type: "string",
      hint: "Provide exactly one of Assistant ID, Squad ID or Workflow ID.",
    },
    { key: "squadId", label: "Squad ID", type: "string" },
    { key: "workflowId", label: "Workflow ID", type: "string" },
    {
      key: "phoneNumberId",
      label: "Phone Number ID",
      type: "string",
      hint: "The Vapi phone number to call FROM. Omit for a web call.",
    },
    {
      key: "customerNumber",
      label: "Customer phone number",
      type: "string",
      hint: "E.164 format, e.g. +14155551234. Omit for a web call.",
    },
    { key: "customerName", label: "Customer name", type: "string" },
    {
      key: "name",
      label: "Call name",
      type: "string",
      hint: "For your own reference only. Max 40 characters.",
    },
    {
      key: "assistantOverrides",
      label: "Assistant overrides (JSON)",
      type: "json",
      hint: "Overrides for the assistant's settings and template variables for this call only. " +
        "See Vapi's AssistantOverrides schema.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "status", type: "string", label: "Call status" },
  ],

  async execute(input, ctx) {
    const call = await new VapiClient(ctx).json("/call", {
      method: "POST",
      body: {
        assistantId: input.assistantId,
        squadId: input.squadId,
        workflowId: input.workflowId,
        phoneNumberId: input.phoneNumberId,
        customer: input.customerNumber
          ? { number: input.customerNumber, name: input.customerName }
          : undefined,
        name: input.name,
        assistantOverrides: asOptionalJson(input.assistantOverrides, "assistantOverrides"),
      },
    });
    return stripSecrets(call);
  },
};

export default callCreate;
