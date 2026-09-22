import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexNamedResource, encodeId } from "../lib/client.ts";
import { locationIdParam } from "../lib/params.ts";

/**
 * `GET /v2/locations/{id}` — one location by id.
 *
 * Useful for resolving a `location_id` a user record carries into something a
 * person can read, since users reference locations by id only.
 */
interface Input {
  id: string;
}

const locationGet: ActionDefinition<Input> = {
  key: "location-get",
  type: "read",
  resource: "location",
  title: "Get Location",
  description: "Fetch one Brex location by id.",
  params: [locationIdParam],
  output: [
    { key: "id", type: "string", label: "Location id" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexNamedResource>(`/locations/${encodeId(input.id)}`);
  },
};

export default locationGet;
