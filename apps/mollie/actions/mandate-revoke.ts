import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, mandateIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `DELETE /v2/customers/{id}/mandates/{mandateId}` — revoke a mandate.
 * Cannot be undone; a customer needing to pay again must set up a new one
 * (typically via a fresh `first` payment).
 */
interface Input {
  customerId: string;
  mandateId: string;
  testmode?: boolean;
}

const mandateRevoke: ActionDefinition<Input> = {
  key: "mandate-revoke",
  type: "perform",
  resource: "mandate",
  title: "Revoke Mandate",
  description:
    "Revoke a mandate. Any active subscription using it will stop being charged. Cannot be " +
    "undone.",
  idempotent: true,
  params: [customerIdParam(), mandateIdParam(), testmodeParam],
  output: [
    { key: "mandateId", type: "string", label: "Mandate ID" },
    { key: "revoked", type: "boolean", label: "Revoked" },
  ],

  async execute(input, ctx) {
    await new MollieClient(ctx).delete(
      `/customers/${encodeURIComponent(input.customerId)}/mandates/${
        encodeURIComponent(input.mandateId)
      }`,
      compact({ testmode: input.testmode }),
    );
    return { mandateId: input.mandateId, revoked: true };
  },
};

export default mandateRevoke;
