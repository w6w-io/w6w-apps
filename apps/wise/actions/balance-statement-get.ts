import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/**
 * `GET /profiles/{profileId}/balance-statements/{balanceId}/statement.json` —
 * a balance's transaction history as a JSON statement.
 *
 * ## SCA-protected, and country-restricted for personal tokens
 *
 * Same restriction as Fund Transfer, and documented twice: the OpenAPI bundle
 * marks this endpoint **"SCA protected. SCA requirements apply to profiles
 * registered outside of ... US, AU, NZ, ... CA, MY"** (plus: "viewing the
 * statement on the website or in the mobile app also requires SCA"), and the
 * personal-API-token guide states retrieving balance statements via API is
 * "not supported except for accounts based in the US, Canada, Australia, New
 * Zealand, Singapore, and Malaysia." A caller outside that list should expect
 * an SCA challenge rather than a plain 200.
 *
 * `intervalEnd - intervalStart` cannot exceed 469 days (about 1 year 3
 * months) per the vendor.
 *
 * Wise also serves this data as CSV, PDF, XLSX, CAMT.053, MT940 or QIF — this
 * action only covers the `.json` variant, since an Action hands structured
 * data to the next workflow step, not a file.
 */
interface Input {
  profileId: number;
  balanceId: number;
  currency: string;
  intervalStart: string;
  intervalEnd: string;
  type?: string;
  statementLocale?: string;
}

const balanceStatementGet: ActionDefinition<Input> = {
  key: "balance-statement-get",
  type: "read",
  resource: "balance",
  title: "Get Balance Statement",
  description: "Get a balance's transaction history as a JSON statement. SCA-protected outside " +
    "US/CA/AU/NZ/SG/MY — see this app's README.",
  params: [
    profileIdParam,
    { key: "balanceId", label: "Balance ID", type: "number", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "ISO 4217 code of the balance being statemented.",
    },
    {
      key: "intervalStart",
      label: "Statement start",
      type: "datetime",
      required: true,
      hint: "UTC. The interval cannot exceed 469 days.",
    },
    {
      key: "intervalEnd",
      label: "Statement end",
      type: "datetime",
      required: true,
      hint: "UTC. The interval cannot exceed 469 days.",
    },
    {
      key: "type",
      label: "Statement type",
      type: "select",
      options: [
        { value: "COMPACT", label: "Compact — one line per transaction" },
        { value: "FLAT", label: "Flat — transaction fees on a separate line" },
      ],
      advanced: true,
    },
    {
      key: "statementLocale",
      label: "Locale",
      type: "string",
      advanced: true,
      hint: "2-character language code for the statement text.",
    },
  ],
  output: [
    { key: "accountHolder", type: "object", label: "Account holder details" },
    { key: "transactions", type: "array", label: "Statement transactions" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(
      `/profiles/${input.profileId}/balance-statements/${input.balanceId}/statement.json`,
      {
        query: {
          currency: input.currency,
          intervalStart: input.intervalStart,
          intervalEnd: input.intervalEnd,
          type: input.type,
          statementLocale: input.statementLocale,
        },
      },
    );
  },
};

export default balanceStatementGet;
