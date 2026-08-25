import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

/** `GET /v3/verified-contacts/{phone_number}`. */
const verifiedContactGet: ActionDefinition<Input> = {
  key: "verified-contact-get",
  type: "read",
  resource: "verified-contact",
  title: "Get Verified Contact",
  description: "Retrieve one verified-contact route by phone number.",
  params: [
    { key: "phoneNumber", label: "Phone number", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Verified-contact record" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(`/v3/verified-contacts/${encodeURIComponent(input.phoneNumber)}`);
  },
};

export default verifiedContactGet;
