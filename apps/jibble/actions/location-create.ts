import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * `POST /v1/Locations` — add a clock-in location.
 *
 * `geoFenceRadius`/`geoFenceUnits` build the vendor's nested `geoFence: {radius, units}`
 * object; coordinates are optional (a location can be address-only).
 */
interface Input {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geoFenceRadius?: number;
  geoFenceUnits?: "Meters" | "Feet";
}

const locationCreate: ActionDefinition<Input> = {
  key: "location-create",
  type: "perform",
  resource: "location",
  title: "Create Location",
  description: "Add a new clock-in location.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "address", label: "Address", type: "string" },
    { key: "latitude", label: "Latitude", type: "number", row: "coordinates" },
    { key: "longitude", label: "Longitude", type: "number", row: "coordinates" },
    {
      key: "geoFenceRadius",
      label: "Geofence radius",
      type: "number",
      advanced: true,
      row: "geofence",
    },
    {
      key: "geoFenceUnits",
      label: "Geofence units",
      type: "select",
      default: "Meters",
      advanced: true,
      row: "geofence",
      options: [
        { value: "Meters", label: "Meters" },
        { value: "Feet", label: "Feet" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Location ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    if (!input.name) throw new Error("name is required");
    const hasCoordinates = input.latitude !== undefined && input.longitude !== undefined;
    return await new JibbleClient(ctx).json(WORKSPACE_HOST, "/v1/Locations", {
      method: "POST",
      body: {
        name: input.name,
        address: input.address || undefined,
        ...(hasCoordinates
          ? { coordinates: { latitude: input.latitude, longitude: input.longitude } }
          : {}),
        ...(input.geoFenceRadius !== undefined
          ? { geoFence: { radius: input.geoFenceRadius, units: input.geoFenceUnits ?? "Meters" } }
          : {}),
      },
    });
  },
};

export default locationCreate;
