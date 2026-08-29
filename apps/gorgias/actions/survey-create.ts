import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { surveyOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
  customerId: number;
  shouldSendDatetime?: string;
  bodyText?: string;
  score?: number;
}

/**
 * `POST /satisfaction-surveys` — verified against the inline request-body
 * schema on developers.gorgias.com/reference/create-satisfaction-survey.
 * Leaving `should_send_datetime` unset means Gorgias will not send the
 * survey, per that page's own description.
 */
const surveyCreate: ActionDefinition<Input> = {
  key: "survey-create",
  type: "perform",
  resource: "satisfaction-survey",
  title: "Create Satisfaction Survey",
  description: "Create a CSAT survey tied to a ticket and customer.",
  // Gorgias mints a new survey id per call.
  idempotent: false,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    {
      key: "shouldSendDatetime",
      label: "Send at",
      type: "datetime",
      hint: "When Gorgias should send the survey. Leave unset to create it without sending.",
    },
    {
      key: "bodyText",
      label: "Comment",
      type: "text",
      advanced: true,
      hint: "Pre-fills the customer's comment, if already known.",
    },
    {
      key: "score",
      label: "Score",
      type: "number",
      advanced: true,
      validation: { min: 1, max: 5, integer: true },
      hint: "1 to 5, if the score is already known.",
    },
  ],
  output: surveyOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/satisfaction-surveys", {
      method: "POST",
      body: {
        ticket_id: input.ticketId,
        customer_id: input.customerId,
        should_send_datetime: unset(input.shouldSendDatetime),
        body_text: unset(input.bodyText),
        score: input.score,
      },
    });
  },
};

export default surveyCreate;
