import type { ActionDefinition } from "@w6w/types";
import { PdfCoClient } from "../lib/client.ts";
import { BALANCE_PATH } from "../health/quota.ts";

/**
 * `GET /v1/account/credit/balance` — the same endpoint the API-key `test`
 * hook and the `quota` health check use (see those files). Exposed as an
 * ordinary Action too, so a workflow can branch on remaining credits before
 * running a large batch of metered conversions.
 */
type Input = Record<string, never>;

interface Output {
  remainingCredits?: number;
}

const accountBalanceGet: ActionDefinition<Input, Output> = {
  key: "account-balance-get",
  type: "read",
  title: "Get Account Credit Balance",
  description: "Read the number of PDF.co credits remaining on this account.",
  params: [],
  output: [{ key: "remainingCredits", type: "number", label: "Remaining credits" }],

  async execute(_input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.get<Output>(BALANCE_PATH);
  },
};

export default accountBalanceGet;
