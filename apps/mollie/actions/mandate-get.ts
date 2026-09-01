import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, mandateIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  mandateId: string;
  testmode?: boolean;
}

const mandateGet: ActionDefinition<Input> = {
  key: "mandate-get",
  type: "read",
  resource: "mandate",
  title: "Get Mandate",
  description: "Retrieve a single mandate for a customer.",
  params: [customerIdParam(), mandateIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Mandate ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "method", type: "string", label: "Method" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/customers/${encodeURIComponent(input.customerId)}/mandates/${
        encodeURIComponent(input.mandateId)
      }`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default mandateGet;
