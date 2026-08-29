import type { ActionDefinition } from "@w6w/types";
import { DialpadClient } from "../lib/client.ts";
import { groupTypeOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/call` — "Initiate via Ring": rings a user's devices (or one
 * specified device) to place an outbound call.
 *
 * The vendor's own note: "the user must have at least one active device (a
 * web, desktop or mobile Dialpad app; a CTI application; or a physical
 * deskphone)". This is the real, server-side call-initiation endpoint the
 * OpenAPI document defines — there is no way to place a call without an
 * already-registered device to ring, so an entirely device-less API key cannot
 * originate audio, only start the ringing that connects one.
 *
 * Rate limit: 5 per minute (the tightest limit of any action in this app).
 * There is no idempotency key on this endpoint, and calling it twice rings and
 * bills two separate calls, so this is declared non-idempotent.
 */
interface Input {
  phoneNumber: string;
  userId: string;
  deviceId?: string;
  outboundCallerId?: string;
  isConsult?: boolean;
  customData?: string;
  groupId?: string;
  groupType?: string;
}

const callInitiate: ActionDefinition<Input> = {
  key: "call-initiate",
  type: "perform",
  resource: "call",
  title: "Initiate Call (Ring)",
  description:
    "Ring an outbound call to a phone number, using the calling user's Dialpad devices. The user " +
    "must have at least one active device (Dialpad app, CTI app, or deskphone).",
  idempotent: false,
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "E164-formatted number to call, e.g. +14155550100.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The id of the Dialpad user who should place the outbound call.",
    },
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      hint: "Ring only this one device instead of all of the user's active devices.",
    },
    {
      key: "outboundCallerId",
      label: "Outbound caller ID",
      type: "string",
      hint: 'E164-formatted number shown to the recipient, or "blocked" to show "unknown ' +
        "caller\". Can be the caller's own number, the caller's group number, or the company's " +
        "reserved number.",
    },
    {
      key: "isConsult",
      label: "Consult call",
      type: "boolean",
      hint: "Start a second call, putting any ongoing call on hold.",
    },
    {
      key: "customData",
      label: "Custom data",
      type: "string",
      hint: "Extra data associated with the call, passed through to any subscribed call events.",
    },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "The office/department/call center to place the call on behalf of.",
    },
    {
      key: "groupType",
      label: "Group type",
      type: "select",
      options: groupTypeOptions,
      hint: "Required whenever Group ID is set.",
    },
  ],
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "state", type: "string", label: "Call state" },
  ],

  execute(input, ctx) {
    ctx.log("info", "ringing outbound call", { userId: input.userId });
    return new DialpadClient(ctx).json("/call", {
      method: "POST",
      body: {
        phone_number: input.phoneNumber,
        user_id: Number(input.userId),
        device_id: input.deviceId,
        outbound_caller_id: input.outboundCallerId,
        is_consult: input.isConsult,
        custom_data: input.customData,
        group_id: input.groupId ? Number(input.groupId) : undefined,
        group_type: input.groupType,
      },
    });
  },
};

export default callInitiate;
