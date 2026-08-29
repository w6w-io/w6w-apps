import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  externalId: string;
}

/** `GET /v1/customers/externalId={externalId}` — verified against the Core Resources OAS. */
const customerFindByExternalId: ActionDefinition<Input> = {
  key: "customer-find-by-external-id",
  type: "read",
  resource: "customer",
  title: "Find Customer by External ID",
  description: "Look up a customer by the identifier your own system assigned it.",
  params: [{ key: "externalId", label: "External ID", type: "string", required: true }],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(
      `/customers/externalId=${encodeURIComponent(input.externalId)}`,
    );
  },
};

export default customerFindByExternalId;
