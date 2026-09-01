import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentId: string;
  testmode?: boolean;
}

const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Retrieve a single payment by ID.",
  params: [paymentIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "method", type: "string", label: "Method" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/payments/${encodeURIComponent(input.paymentId)}`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default paymentGet;
