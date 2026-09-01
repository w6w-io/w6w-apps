import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { profileIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `GET /v2/methods` — the payment methods **activated and available** for
 * this profile right now (respects amount/sequenceType/country filters when
 * given). Distinct from `method-list-all`, which lists every method the
 * profile could ever activate.
 */
interface Input {
  amountValue?: string;
  amountCurrency?: string;
  sequenceType?: "oneoff" | "first" | "recurring";
  locale?: string;
  billingCountry?: string;
  includeWallets?: string;
  profileId?: string;
  testmode?: boolean;
}

const methodList: ActionDefinition<Input> = {
  key: "method-list",
  type: "search",
  resource: "method",
  title: "List Enabled Payment Methods",
  description: "List payment methods currently enabled for this profile.",
  params: [
    {
      key: "amountValue",
      label: "Amount — value",
      type: "string",
      advanced: true,
      row: "amount",
      hint: "Filter to methods that support this amount.",
    },
    {
      key: "amountCurrency",
      label: "Amount — currency",
      type: "string",
      advanced: true,
      row: "amount",
      default: "EUR",
    },
    {
      key: "sequenceType",
      label: "Sequence type",
      type: "select",
      advanced: true,
      options: [
        { label: "One-off", value: "oneoff" },
        { label: "First (recurring-capable)", value: "first" },
        { label: "Recurring", value: "recurring" },
      ],
    },
    { key: "locale", label: "Locale", type: "string", advanced: true, placeholder: "nl_NL" },
    {
      key: "billingCountry",
      label: "Billing country",
      type: "string",
      advanced: true,
      placeholder: "NL",
    },
    {
      key: "includeWallets",
      label: "Include wallets",
      type: "string",
      advanced: true,
      placeholder: "applepay",
    },
    profileIdParam,
    testmodeParam,
  ],
  output: [
    { key: "count", type: "number", label: "Number of items" },
    { key: "items", type: "array", label: "Methods" },
  ],

  async execute(input, ctx) {
    // Mollie encodes the `amount` query param as `style: deepObject` —
    // `amount[value]=10.00&amount[currency]=EUR`, not a JSON string.
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/methods",
      compact({
        "amount[value]": input.amountValue,
        "amount[currency]": input.amountValue ? (input.amountCurrency || "EUR") : undefined,
        sequenceType: input.sequenceType,
        locale: input.locale,
        billingCountry: input.billingCountry,
        includeWallets: input.includeWallets,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
    return { count: unwrapList(body, "methods").length, items: unwrapList(body, "methods") };
  },
};

export default methodList;
