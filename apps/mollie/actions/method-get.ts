import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { methodIdParam, profileIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  methodId: string;
  locale?: string;
  currency?: string;
  profileId?: string;
  testmode?: boolean;
}

const methodGet: ActionDefinition<Input> = {
  key: "method-get",
  type: "read",
  resource: "method",
  title: "Get Payment Method",
  description: "Retrieve details (min/max amount, image, issuers) for one payment method.",
  params: [
    methodIdParam(),
    { key: "locale", label: "Locale", type: "string", advanced: true, placeholder: "nl_NL" },
    { key: "currency", label: "Currency", type: "string", advanced: true, default: "EUR" },
    profileIdParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Method ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "minimumAmount", type: "object", label: "Minimum amount" },
    { key: "maximumAmount", type: "object", label: "Maximum amount" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/methods/${encodeURIComponent(input.methodId)}`,
      compact({
        locale: input.locale,
        currency: input.currency,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
  },
};

export default methodGet;
