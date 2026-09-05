import type { ActionDefinition } from "@w6w/types";
import { REGION_OPTIONS, ZeroBounceClient } from "../lib/client.ts";

interface Input {
  region?: string;
}

/**
 * `GET /v2/getcredits` — how many validation credits remain on the account.
 * Source: `https://www.zerobounce.net/docs/email-validation-api-quickstart`
 * ("GET / POST /V2/GETCREDITS" — this app uses GET, matching every SDK
 * example).
 *
 * `Credits` — capitalized, unlike every other field this app touches, which
 * are lowercase snake_case — is `-1` when the API key is invalid, per the
 * docs' own "Error Response" example (`{"Credits":-1}`), with no distinct
 * HTTP status documented for that case. See `lib/client.ts`'s module doc.
 */
const getCredits: ActionDefinition<Input> = {
  key: "get-credits",
  type: "read",
  resource: "account",
  title: "Get Credits",
  description: "Check the number of validation credits remaining on the account.",
  params: [
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "default",
      options: REGION_OPTIONS,
      advanced: true,
    },
  ],
  output: [
    {
      key: "Credits",
      type: "number",
      label: "Credits remaining (-1 means the API key is invalid)",
    },
  ],

  execute(input, ctx) {
    const client = new ZeroBounceClient(ctx);
    return client.request("/v2/getcredits", { region: input.region });
  },
};

export default getCredits;
