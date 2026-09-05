import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/**
 * `GET /profiles/{profileId}` — a single profile's details.
 *
 * The response shape depends on `type`: `PERSONAL` and `BUSINESS` profiles
 * carry different field sets (a discriminated union in the vendor's schema),
 * so this action passes the whole object through rather than picking fields
 * that would only exist on one of the two.
 */
interface Input {
  profileId: number;
}

const profileGet: ActionDefinition<Input> = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get Profile",
  description: "Get a single personal or business profile by ID.",
  params: [profileIdParam],
  output: [
    { key: "id", type: "number", label: "Profile ID" },
    { key: "type", type: "string", label: "Profile type" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(`/profiles/${input.profileId}`);
  },
};

export default profileGet;
