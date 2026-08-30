import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";

/**
 * `GET /organizations` — "Retrieve information on your account and any
 * organization you belong to." Confirmed against the vendor's collection; no
 * query parameters are documented, and the collection captures no example
 * response body for this request, so the body is returned as received rather
 * than guessed at.
 *
 * Read this before calling any other action with an optional `organizationId`
 * — it is the source of the ids that param accepts.
 */
const organizationList: ActionDefinition<Record<string, never>> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "List the organizations the connected account belongs to.",
  params: [],
  output: [
    {
      key: "result",
      type: "object",
      label: "Response body, verbatim (the vendor documents no example shape for this endpoint)",
    },
  ],

  async execute(_input, ctx) {
    const result = await new VideoAskClient(ctx).entity("/organizations");
    return { result };
  },
};

export default organizationList;
