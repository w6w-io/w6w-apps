import type { ActionDefinition } from "@w6w/types";
import { compactBody, WiseClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/**
 * `POST /profiles/{profileId}/transfers/{transferId}/payments` — fund a
 * transfer, the step that actually moves money after Create Transfer.
 *
 * ## SCA-protected, and country-restricted for personal tokens
 *
 * The OpenAPI bundle marks this endpoint explicitly: **"This endpoint is SCA
 * protected. SCA requirements apply to profiles registered outside of the
 * following regions: US, AU, NZ, ... CA, MY."** The personal-API-token guide
 * says the same thing from the other direction: "Funding transfers ... via
 * API [is] not supported except for accounts based in the US, Canada,
 * Australia, New Zealand, Singapore, and Malaysia." A personal-token
 * connection outside that list will not be able to complete this call
 * headlessly — this action still exists because it is real, documented, and
 * works for OAuth partner flows and for the listed regions, but a caller
 * outside them should expect an SCA challenge rather than a plain 200.
 *
 * ## `type` selects the funding source
 *
 * Wise's `FundingRequest` is a discriminated union on `type`. `BALANCE` — pull
 * funds from a multi-currency balance — is what a transfer-by-transfer
 * settlement model uses and is the only one exposed with a dedicated field
 * here; the bulk/pre-fund variants exist for the Bulk Settlement model and are
 * out of this app's scope (see the README).
 */
interface Input {
  profileId: number;
  transferId: number;
  type: string;
  balanceId?: number;
}

const transferFund: ActionDefinition<Input> = {
  key: "transfer-fund",
  type: "perform",
  resource: "transfer",
  title: "Fund Transfer",
  description:
    "Fund a transfer from a multi-currency balance. SCA-protected outside US/CA/AU/NZ/SG/MY — " +
    "see this app's README.",
  // No documented idempotency key on this endpoint, and it moves money — a
  // retry after an ambiguous network failure is not provably safe to repeat.
  idempotent: false,
  params: [
    profileIdParam,
    { key: "transferId", label: "Transfer ID", type: "number", required: true },
    {
      key: "type",
      label: "Funding type",
      type: "select",
      default: "BALANCE",
      options: [
        { value: "BALANCE", label: "Balance — pull funds from a multi-currency balance" },
        {
          value: "TRUSTED_PRE_FUND_BULK",
          label: "Trusted pre-fund (bulk) — Bulk Settlement model only",
        },
        {
          value: "TRUSTED_PRE_FUND_TX",
          label: "Trusted pre-fund (transaction) — Bulk Settlement model only",
        },
      ],
      required: true,
    },
    {
      key: "balanceId",
      label: "Balance ID",
      type: "number",
      hint: "Required when funding type is BALANCE. From Balance List.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Funding status" },
    { key: "type", type: "string", label: "Funding type used" },
  ],

  execute(input, ctx) {
    if (input.type === "BALANCE" && input.balanceId == null) {
      throw new Error("balanceId is required when funding type is BALANCE");
    }
    ctx.log("info", "funding Wise transfer", { transferId: input.transferId, type: input.type });
    return new WiseClient(ctx).json(
      `/profiles/${input.profileId}/transfers/${input.transferId}/payments`,
      {
        method: "POST",
        body: compactBody({ type: input.type, balanceId: input.balanceId }),
      },
    );
  },
};

export default transferFund;
