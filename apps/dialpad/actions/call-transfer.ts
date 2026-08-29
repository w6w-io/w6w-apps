import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `POST /api/v2/call/{id}/transfer` — transfer a call to another destination.
 *
 * Dialpad documents the destination (`to`) as a `oneOf` over four shapes —
 * a phone number, a target (office/department/call center/user), an existing
 * call to merge into, or a specific operator on a target. This action exposes
 * all four behind a "Destination type" select rather than four separate
 * actions, since exactly one is ever sent per call.
 *
 * No idempotency key is documented, and a second transfer of an already-moved
 * call is a different operation on a different call state, not a safe retry —
 * declared non-idempotent.
 */
type DestinationType = "number" | "target" | "call" | "agent";

interface Input {
  callId: string;
  destinationType: DestinationType;
  number?: string;
  targetId?: string;
  targetType?: "callcenter" | "department" | "office" | "user";
  toCallId?: string;
  operatorId?: string;
  transferState?: "hold" | "parked" | "preanswer" | "voicemail";
  customData?: string;
}

function buildDestination(input: Input): Record<string, unknown> {
  switch (input.destinationType) {
    case "number":
      return { number: input.number };
    case "target":
      return { target_id: Number(input.targetId), target_type: input.targetType };
    case "call":
      return { call_id: Number(input.toCallId) };
    case "agent":
      return { operator_id: Number(input.operatorId), target_id: Number(input.targetId) };
  }
}

const callTransfer: ActionDefinition<Input> = {
  key: "call-transfer",
  type: "perform",
  resource: "call",
  title: "Transfer Call",
  description: "Transfer a call to a phone number, a target, an existing call, or an operator.",
  idempotent: false,
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
    {
      key: "destinationType",
      label: "Destination type",
      type: "select",
      required: true,
      options: [
        { value: "number", label: "Phone number" },
        { value: "target", label: "Target (office / department / call center / user)" },
        { value: "call", label: "Existing call (merge)" },
        { value: "agent", label: "Operator on a target" },
      ],
    },
    {
      key: "number",
      label: "Phone number",
      type: "string",
      hint: "E164 format. Required when Destination type is Phone number.",
      showIf: { "==": [{ var: "destinationType" }, "number"] },
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
      hint: "Required when Destination type is Target or Operator on a target.",
      showIf: { "in": [{ var: "destinationType" }, ["target", "agent"]] },
    },
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      options: [
        { value: "callcenter", label: "Call center" },
        { value: "department", label: "Department" },
        { value: "office", label: "Office" },
        { value: "user", label: "User" },
      ],
      hint: "Required when Destination type is Target.",
      showIf: { "==": [{ var: "destinationType" }, "target"] },
    },
    {
      key: "toCallId",
      label: "Destination call ID",
      type: "string",
      hint: "Required when Destination type is Existing call.",
      showIf: { "==": [{ var: "destinationType" }, "call"] },
    },
    {
      key: "operatorId",
      label: "Operator ID",
      type: "string",
      hint: "Required when Destination type is Operator on a target.",
      showIf: { "==": [{ var: "destinationType" }, "agent"] },
    },
    {
      key: "transferState",
      label: "Transfer state",
      type: "select",
      options: [
        { value: "hold", label: "Hold" },
        { value: "parked", label: "Parked" },
        { value: "preanswer", label: "Pre-answer" },
        { value: "voicemail", label: "Voicemail" },
      ],
      hint: "The state the call should be in once transferred. Leave empty for the default.",
    },
    { key: "customData", label: "Custom data", type: "string" },
  ],
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "state", type: "string", label: "Call state" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/call/${encodeId(input.callId)}/transfer`, {
      method: "POST",
      body: {
        to: buildDestination(input),
        transfer_state: input.transferState,
        custom_data: input.customData,
      },
    });
  },
};

export default callTransfer;
