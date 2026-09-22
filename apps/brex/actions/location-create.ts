import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexNamedResource, compact } from "../lib/client.ts";
import { idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/locations` — create a location.
 *
 * `name` is the only required field; `description` is the only other one the
 * endpoint accepts. A location is one of the three directory resources a user
 * can be assigned to (see `user-invite` / `user-update`).
 *
 * There is no vendor-side uniqueness rule documented for `name`, so a retry
 * creates a second location: the action is declared non-idempotent, and Brex's
 * optional `Idempotency-Key` header is exposed for a caller that wants the
 * deduplication. This app forwards a key when one is given and never invents
 * one.
 */
interface Input {
  name: string;
  description?: string;
  idempotencyKey?: string;
}

const locationCreate: ActionDefinition<Input> = {
  key: "location-create",
  type: "perform",
  resource: "location",
  title: "Create Location",
  description: "Create a Brex location, optionally with a description.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "string" },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Location id" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexNamedResource>("/locations", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: compact({ name: input.name, description: input.description }),
    });
  },
};

export default locationCreate;
