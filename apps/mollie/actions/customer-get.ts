import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  testmode?: boolean;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single customer by ID.",
  params: [customerIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/customers/${encodeURIComponent(input.customerId)}`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default customerGet;
