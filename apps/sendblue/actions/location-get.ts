import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  number: string;
  fromNumber: string;
}

/**
 * `GET /api/location/{number}` — one contact's currently-shared Find My
 * location. Shared lines cannot use this endpoint.
 */
const locationGet: ActionDefinition<Input> = {
  key: "location-get",
  type: "read",
  resource: "location",
  title: "Get Shared Location",
  description: "Read one contact's currently-shared Find My location, if they already share " +
    "with a V2 Sendblue line.",
  params: [
    { key: "number", label: "Contact number", type: "string", required: true },
    { key: "fromNumber", label: "Your V2 Sendblue number", type: "string", required: true },
  ],
  output: [{ key: "location", type: "object", label: "Location" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(`/api/location/${encodeURIComponent(input.number)}`, {
      from_number: input.fromNumber,
    });
  },
};

export default locationGet;
