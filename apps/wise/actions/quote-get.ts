import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/** `GET /profiles/{profileId}/quotes/{quoteId}` — re-read a previously created quote. */
interface Input {
  profileId: number;
  quoteId: string;
}

const quoteGet: ActionDefinition<Input> = {
  key: "quote-get",
  type: "read",
  resource: "quote",
  title: "Get Quote",
  description: "Get a previously created quote by ID.",
  params: [
    profileIdParam,
    {
      key: "quoteId",
      label: "Quote ID",
      type: "string",
      required: true,
      hint: "UUID from Create Quote's response.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Quote ID" },
    { key: "rate", type: "number", label: "Exchange rate" },
    { key: "rateExpirationTime", type: "string", label: "When the locked rate expires" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(`/profiles/${input.profileId}/quotes/${input.quoteId}`);
  },
};

export default quoteGet;
