import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  start?: string;
  end?: string;
  message?: string;
}

/**
 * POST /forms/{formId}/public-link-availability — set the window (start/end date-time) during
 * which a form's public link is open, plus the message shown outside it. Requires `Form:Read/Write`.
 */
const formPublicLinkAvailabilitySet: ActionDefinition<Input> = {
  key: "form-public-link-availability-set",
  type: "perform",
  resource: "form",
  title: "Set Public Link Availability",
  description:
    "Set the start/end window a form's public link is open, and its unavailable message.",
  // Setting the same window and message twice converges on the same state.
  idempotent: true,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "start",
      label: "Start",
      type: "datetime",
      hint: "ISO 8601 date-time the public link becomes available.",
    },
    {
      key: "end",
      label: "End",
      type: "datetime",
      hint: "ISO 8601 date-time the public link stops being available.",
    },
    {
      key: "message",
      label: "Not-available message",
      type: "string",
      hint: "Shown to visitors outside the availability window.",
    },
  ],
  output: [
    { key: "AvailabilityStart", type: "string", label: "Resolved start date-time" },
    { key: "AvailabilityEnd", type: "string", label: "Resolved end date-time" },
    { key: "NotAvailableMessage", type: "string", label: "Resolved not-available message" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "setting Cognito Forms public link availability", { formId: input.formId });
    return await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/public-link-availability`,
      {
        method: "POST",
        body: { Start: input.start, End: input.end, Message: input.message },
      },
    );
  },
};

export default formPublicLinkAvailabilitySet;
