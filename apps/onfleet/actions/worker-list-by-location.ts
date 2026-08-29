import type { ActionDefinition } from "@w6w/types";
import { compact, OnfleetClient } from "../lib/client.ts";

/**
 * `GET /workers/location` — every worker within a radius of a point.
 *
 * Useful for "who's nearest" dispatch logic without downloading and
 * filtering the entire roster.
 */
const action: ActionDefinition = {
  key: "worker-list-by-location",
  type: "search",
  resource: "worker",
  title: "List workers near a location",
  description: "Find workers within a radius (meters) of a coordinate.",
  params: [
    { key: "longitude", label: "Longitude", type: "number", required: true },
    { key: "latitude", label: "Latitude", type: "number", required: true },
    {
      key: "radius",
      label: "Radius (meters)",
      type: "number",
      default: 1000,
      hint: "Defaults to 1000. Maximum 10000.",
    },
  ],
  output: [{ key: "workers", type: "array", label: "Workers" }],

  async execute(input, ctx) {
    const { longitude, latitude, radius } = input as {
      longitude: number;
      latitude: number;
      radius?: number;
    };
    if (longitude === undefined || longitude === null) throw new Error("`longitude` is required");
    if (latitude === undefined || latitude === null) throw new Error("`latitude` is required");

    const workers = await new OnfleetClient(ctx).request<unknown[]>("/workers/location", {
      query: compact({ longitude, latitude, radius }) as Record<string, number>,
    });
    return { workers: workers ?? [] };
  },
};

export default action;
