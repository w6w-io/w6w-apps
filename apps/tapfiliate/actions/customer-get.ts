import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

/** `GET /customers/{id}/` */
interface Input {
  id: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a single customer by its Tapfiliate-generated id.",
  params: [customerIdParam],
  output: [
    { key: "id", type: "string", label: "Customer id" },
    { key: "customer_id", type: "string", label: "Your own id for this customer" },
    { key: "status", type: "string", label: "trial | new | paying | canceled, etc." },
    { key: "created_at", type: "string", label: "Creation time" },
    { key: "program", type: "object", label: "The program this customer belongs to" },
    { key: "affiliate", type: "object", label: "The referring affiliate" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/customers/${encodeId(input.id)}/`);
  },
};

export default customerGet;
