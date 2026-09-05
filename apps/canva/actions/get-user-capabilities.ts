import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

/**
 * `GET /v1/users/me/capabilities` — requires `profile:read`. Tells you
 * whether the connected user's plan/org membership unlocks capabilities
 * that gate other endpoints here — `brand_template` gates the brand
 * template actions, `autofill` gates the autofill job actions, `resize`
 * gates design resizing (not implemented in this app).
 */
const getUserCapabilities: ActionDefinition<Record<string, never>> = {
  key: "get-user-capabilities",
  type: "read",
  resource: "user",
  title: "Get User Capabilities",
  description: "List which gated API capabilities (analytics, autofill, brand templates, " +
    "premium export, resize, team-restricted apps) the connected user has.",
  params: [],
  output: [
    { key: "capabilities", type: "array", label: "Capabilities" },
  ],

  execute(_input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request("/rest/v1/users/me/capabilities");
  },
};

export default getUserCapabilities;
