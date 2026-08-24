import type { ActionDefinition } from "@w6w/types";
import { compact, RetellClient } from "../lib/client.ts";

/**
 * `POST /v2/create-phone-call` — dial an outbound phone call.
 *
 * Verified against the OpenAPI document's `createPhoneCall` operation. The
 * response arrives immediately with `call_status: "registered"` — it does
 * NOT wait for the call to connect or finish. `transcript`, `recording_url`,
 * `call_analysis`, `duration_ms` and most of the interesting fields on the
 * call record are populated only once the call reaches `ended`, which
 * happens asynchronously and can be minutes later for a long call. Poll
 * `get-call`, or better, configure the agent's webhook in the Retell
 * dashboard to be told when the call ends rather than polling for it.
 *
 * `agent_override` and `override_agent_version` are left out: both take a
 * nested object mirroring a large slice of the Agent schema (voice, LLM,
 * webhook, tool config) that this app does not otherwise model, and getting
 * one field of it wrong silently falls back to the bound agent's own
 * configuration for anything unset. `override_agent_id` alone — a plain
 * string swap to a different, already-configured agent — is unambiguous and
 * is what this action exposes.
 */
interface Input {
  fromNumber: string;
  toNumber: string;
  overrideAgentId?: string;
  metadata?: Record<string, unknown>;
  dynamicVariables?: Record<string, string>;
  customSipHeaders?: Record<string, string>;
  ignoreE164Validation?: boolean;
}

interface Output {
  call_id: string;
  agent_id: string;
  call_status: string;
  from_number: string;
  to_number: string;
  direction: string;
  [key: string]: unknown;
}

const createPhoneCall: ActionDefinition<Input, Output> = {
  key: "create-phone-call",
  type: "perform",
  resource: "call",
  title: "Create Phone Call",
  description: "Start an outbound phone call from a number this account owns or has imported.",
  idempotent: false,
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      placeholder: "+14157774444",
      hint: "E.164 format. Must be a number purchased from Retell or imported to Retell.",
    },
    {
      key: "toNumber",
      label: "To number",
      type: "string",
      required: true,
      placeholder: "+12137774445",
      hint: "E.164 format. Only US numbers are supported as destination when From is a Retell " +
        "number.",
    },
    {
      key: "overrideAgentId",
      label: "Override agent ID",
      type: "string",
      hint: "One-time override of the agent bound to this number, for this call only.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Arbitrary object stored on the call for your own reference (e.g. your internal " +
        "customer id). Not used by Retell for processing.",
    },
    {
      key: "dynamicVariables",
      label: "Dynamic variables",
      type: "json",
      hint: "String key/value pairs injected into the agent's prompt and tool descriptions, " +
        'e.g. {"customer_name": "John Doe"}. Response Engine agents only.',
    },
    {
      key: "customSipHeaders",
      label: "Custom SIP headers",
      type: "json",
      hint: "Custom SIP headers to add to the call.",
    },
    {
      key: "ignoreE164Validation",
      label: "Ignore E.164 validation",
      type: "boolean",
      hint: "Only applies with custom telephony, to dial internal pseudo numbers.",
    },
  ],
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "agent_id", type: "string", label: "Agent ID" },
    { key: "call_status", type: "string", label: "Call status" },
    { key: "from_number", type: "string", label: "From number" },
    { key: "to_number", type: "string", label: "To number" },
    { key: "direction", type: "string", label: "Direction" },
  ],

  execute(input, ctx) {
    return new RetellClient(ctx).request<Output>("/v2/create-phone-call", {
      method: "POST",
      body: compact({
        from_number: input.fromNumber,
        to_number: input.toNumber,
        override_agent_id: input.overrideAgentId,
        metadata: input.metadata,
        retell_llm_dynamic_variables: input.dynamicVariables,
        custom_sip_headers: input.customSipHeaders,
        ignore_e164_validation: input.ignoreE164Validation,
      }),
    });
  },
};

export default createPhoneCall;
