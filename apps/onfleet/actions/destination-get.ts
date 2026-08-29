import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `GET /destinations/:id` — fetch a destination by ID. */
const action: ActionDefinition = {
  key: "destination-get",
  type: "read",
  resource: "destination",
  title: "Get destination",
  description: "Fetch a destination by ID.",
  params: [
    { key: "destinationId", label: "Destination ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "address", type: "object", label: "Address" },
    { key: "location", type: "array", label: "Location" },
  ],

  async execute(input, ctx) {
    const { destinationId } = input as { destinationId: string };
    if (!destinationId) throw new Error("`destinationId` is required");
    return await new OnfleetClient(ctx).request(
      `/destinations/${encodeURIComponent(destinationId)}`,
    );
  },
};

export default action;
