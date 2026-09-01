import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { profileIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `GET /v2/methods/all` — every method the profile could activate, whether
 * enabled or not (each carries its own `status`). Distinct from
 * `method-list`, which only returns already-enabled methods.
 */
interface Input {
  locale?: string;
  amountValue?: string;
  amountCurrency?: string;
  sequenceType?: "oneoff" | "first" | "recurring";
  profileId?: string;
  testmode?: boolean;
}

const methodListAll: ActionDefinition<Input> = {
  key: "method-list-all",
  type: "search",
  resource: "method",
  title: "List All Payment Methods",
  description: "List every payment method the profile could activate, enabled or not.",
  params: [
    { key: "locale", label: "Locale", type: "string", advanced: true, placeholder: "nl_NL" },
    { key: "amountValue", label: "Amount — value", type: "string", advanced: true, row: "amount" },
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
    profileIdParam,
    testmodeParam,
  ],
  output: [
    { key: "count", type: "number", label: "Number of items" },
    { key: "items", type: "array", label: "Methods" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/methods/all",
      compact({
        locale: input.locale,
        "amount[value]": input.amountValue,
        "amount[currency]": input.amountValue ? (input.amountCurrency || "EUR") : undefined,
        sequenceType: input.sequenceType,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
    return { count: unwrapList(body, "methods").length, items: unwrapList(body, "methods") };
  },
};

export default methodListAll;
