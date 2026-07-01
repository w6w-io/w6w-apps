import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  expand?: string;
}

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

const getOrder: ActionDefinition<Input> = {
  key: "get-order",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve a single order by ID.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    { key: "expand", label: "Expand", type: "string", default: DEFAULT_EXPAND },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/orders/${input.orderId}/`, {
      query: { expand: input.expand ?? DEFAULT_EXPAND },
    });
  },
};

export default getOrder;
