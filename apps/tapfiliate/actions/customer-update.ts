import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TapfiliateClient } from "../lib/client.ts";
import { customerIdParam, metaDataParam } from "../lib/params.ts";

/** `PATCH /customers/{id}/` */
interface Input {
  id: string;
  customerId?: string;
  metaData?: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's own-system id and/or meta data.",
  idempotent: true,
  params: [
    customerIdParam,
    { key: "customerId", label: "Your customer id", type: "string" },
    metaDataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer id" },
    { key: "customer_id", type: "string", label: "Your own id, updated" },
    { key: "meta_data", type: "object", label: "Meta data, updated" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/customers/${encodeId(input.id)}/`, {
      method: "PATCH",
      body: compact({ customer_id: input.customerId, meta_data: input.metaData }),
    });
  },
};

export default customerUpdate;
