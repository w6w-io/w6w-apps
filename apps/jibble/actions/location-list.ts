import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/** `GET /v1/Locations` — the organization's clock-in locations (with geofences). */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const locationList: ActionDefinition<Input> = {
  key: "location-list",
  type: "search",
  resource: "location",
  title: "List Locations",
  description: "List the organization's locations.",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Locations" },
    { key: "count", type: "number", label: "Total matching locations (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/Locations", {
      filter: input.filter,
      select: input.select,
      expand: input.expand,
      orderBy: input.orderBy,
      top: input.top,
      skip: input.skip,
      count: input.count,
    });
  },
};

export default locationList;
