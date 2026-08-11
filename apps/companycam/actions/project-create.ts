import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, CompanyCamClient } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/projects` — create a project.
 *
 * **Not idempotent, and this API gives you nothing to make it so.** There is no
 * idempotency-key header or body field anywhere in CompanyCam's OpenAPI
 * document, and no "create or update by external id" endpoint, so a retried
 * call creates a second project. A workflow that syncs jobs from a CRM should
 * search by name first (`project-list` with `query`) rather than rely on the
 * platform to de-duplicate.
 *
 * The vendor's schema marks no field required. This action requires a name
 * anyway: a project with no name is addressable only by id, which makes it
 * invisible to the people using the CompanyCam app.
 *
 * `geofence` is a JSON array of `{lat, lon}` points, not a radius — CompanyCam
 * uses it to attach photos captured inside the polygon to this project.
 */
interface Input {
  name: string;
  address?: Record<string, string>;
  lat?: number;
  lon?: number;
  geofence?: unknown;
  primaryContact?: Record<string, string>;
  actAs?: string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project, optionally with an address, geofence and primary contact.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "CompanyCam's schema marks nothing required here, but a project without a name is " +
        "unusable in the app, so this action insists on one.",
    },
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
      hint: 'A JSON array of points, e.g. [{"lat":28.42,"lon":-81.47}, …]. Photos captured ' +
        "inside the polygon are attached to this project.",
    },
    {
      key: "primaryContact",
      label: "Primary contact",
      type: "group",
      advanced: true,
      children: [
        { key: "name", label: "Name", type: "string" },
        { key: "email", label: "Email", type: "string" },
        { key: "phoneNumber", label: "Phone", type: "string" },
      ],
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
    { key: "project_url", type: "string", label: "Project URL" },
  ],

  execute(input, ctx) {
    const address = input.address ?? {};
    const contact = input.primaryContact ?? {};
    const body = compact({
      name: input.name,
      address: pick({
        street_address_1: address.street1,
        street_address_2: address.street2,
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
      }),
      coordinates: input.lat !== undefined && input.lon !== undefined
        ? { lat: input.lat, lon: input.lon }
        : undefined,
      geofence: asOptionalJson<unknown[]>(input.geofence, "Geofence"),
      primary_contact: contact.name
        ? pick({
          name: contact.name,
          email: contact.email,
          phone_number: contact.phoneNumber,
        })
        : undefined,
    });

    return new CompanyCamClient(ctx).json("/projects", {
      method: "POST",
      body,
      actAs: input.actAs,
    });
  },
};

/** Drop empty sub-object keys, and the sub-object itself when nothing is set. */
function pick(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const out = compact(obj);
  return Object.keys(out).length > 0 ? out : undefined;
}

export default projectCreate;
