import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { chargeIdParam } from "../lib/params.ts";

interface Input {
  chargeId: string;
}

/**
 * `POST /charges/{id}/skip` — skip a charge. Scope: `write_orders`.
 * The reference documents no body parameters for this endpoint. Response
 * envelope: `{"charge": {...}}`.
 *
 * Not marked idempotent: the reference does not state that skipping an
 * already-skipped charge is a safe no-op.
 */
const chargeSkip: ActionDefinition<Input> = {
  key: "charge-skip",
  type: "perform",
  resource: "charge",
  title: "Skip Charge",
  description: "Skip an upcoming charge.",
  idempotent: false,
  params: [chargeIdParam],
  output: [
    { key: "id", type: "number", label: "Charge ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/charges/${encodeURIComponent(input.chargeId)}/skip`,
      "charge",
      { method: "POST", body: {} },
    );
  },
};

export default chargeSkip;
