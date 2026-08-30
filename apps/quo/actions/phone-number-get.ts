import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `GET /v1/phone-numbers/{phoneNumberId}` — get one phone number by its unique identifier. */
interface Input {
  phoneNumberId: string;
}

const phoneNumberGet: ActionDefinition<Input> = {
  key: "phone-number-get",
  type: "read",
  resource: "phone-number",
  title: "Get Phone Number",
  description: "Get a Quo phone number by its unique identifier.",
  params: [
    {
      key: "phoneNumberId",
      label: "Phone number ID",
      type: "string",
      required: true,
      placeholder: "PN123abc",
      hint: "The unique identifier of the Quo phone number.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Phone number (id, name, number, formattedNumber, forward, groupId, " +
        "portingStatus, symbol, users, restrictions)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/phone-numbers/${encodeURIComponent(input.phoneNumberId)}`);
  },
};

export default phoneNumberGet;
