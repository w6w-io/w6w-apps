import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { chargeIdParam } from "../lib/params.ts";

interface Input {
  chargeId: string;
}

/**
 * `POST /charges/{id}/unskip` — reverse a previously-skipped charge. Scope:
 * `write_orders`. The reference documents no body parameters for this
 * endpoint. Response envelope: `{"charge": {...}}`.
 *
 * Not marked idempotent: the reference does not state that unskipping a
 * charge that is not currently skipped is a safe no-op.
 */
const chargeUnskip: ActionDefinition<Input> = {
  key: "charge-unskip",
  type: "perform",
  resource: "charge",
  title: "Unskip Charge",
  description: "Reverse a previously-skipped charge, scheduling it again.",
  idempotent: false,
  params: [chargeIdParam],
  output: [
    { key: "id", type: "number", label: "Charge ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/charges/${encodeURIComponent(input.chargeId)}/unskip`,
      "charge",
      { method: "POST", body: {} },
    );
  },
};

export default chargeUnskip;
