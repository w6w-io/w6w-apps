import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `PUT /v2/projects/{id}` — change a project's name, address, coordinates or
 * geofence.
 *
 * The documented body carries only those four; **`primary_contact` is
 * create-only** in this API, so a contact set at creation cannot be changed
 * through this endpoint, and this action does not pretend otherwise.
 *
 * Idempotent: the body is a complete statement of the fields it names, so
 * re-sending it lands on the same state.
 */
interface Input {
  projectId: string;
  name?: string;
  address?: Record<string, string>;
  lat?: number;
  lon?: number;
  geofence?: unknown;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's name, address, coordinates or geofence.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "address",
      label: "Address",
      type: "group",
      children: [
        { key: "street1", label: "Street address", type: "string" },
        { key: "street2", label: "Street address 2", type: "string" },
        { key: "city", label: "City", type: "string", row: "locality" },
        { key: "state", label: "State", type: "string", row: "locality" },
        { key: "postalCode", label: "Postal code", type: "string", row: "locality" },
        { key: "country", label: "Country", type: "string", placeholder: "US" },
      ],
    },
    { key: "lat", label: "Latitude", type: "number", row: "coords", advanced: true },
    { key: "lon", label: "Longitude", type: "number", row: "coords", advanced: true },
    {
      key: "geofence",
      label: "Geofence",
      type: "json",
      advanced: true,
      hint: 'A JSON array of points, e.g. [{"lat":28.42,"lon":-81.47}, …].',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
  ],

  execute(input, ctx) {
    const address = input.address ?? {};
    const addressBody = compact({
      street_address_1: address.street1,
      street_address_2: address.street2,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country,
    });
    const body = compact({
      name: input.name,
      address: Object.keys(addressBody).length > 0 ? addressBody : undefined,
      coordinates: input.lat !== undefined && input.lon !== undefined
        ? { lat: input.lat, lon: input.lon }
        : undefined,
      geofence: asOptionalJson<unknown[]>(input.geofence, "Geofence"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error(
        "Nothing to update — set at least one of name, address, coordinates " +
          "or geofence",
      );
    }

    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default projectUpdate;
