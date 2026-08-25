import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
}

/**
 * `GET /api/location` — reads Find My locations already shared with a
 * dedicated (V2) Sendblue number. Shared lines cannot use this endpoint.
 */
const locationList: ActionDefinition<Input> = {
  key: "location-list",
  type: "search",
  resource: "location",
  title: "List Shared Locations",
  description: "Read every Find My location currently shared with a V2 Sendblue line.",
  params: [
    { key: "fromNumber", label: "Your V2 Sendblue number", type: "string", required: true },
  ],
  output: [{ key: "locations", type: "array", label: "Shared locations" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/location", { from_number: input.fromNumber });
  },
};

export default locationList;
