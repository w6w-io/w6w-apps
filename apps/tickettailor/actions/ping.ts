import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `GET /v1/ping` — verified against `ping`, 2026-09-05. Needs no credential
 * at all (confirmed live: 200 with no `Authorization` header, and again with
 * a bogus one) and answers `{"version":"1.0"}` — NOT `{"version":"pong"}` as
 * the OpenAPI document's own `example` shows. Exposed as an Action for
 * reachability checks; it proves nothing about a Connection's credential —
 * see `auth/api-key.ts`'s `test` hook for the check that does.
 */
const ping: ActionDefinition<Record<string, never>> = {
  key: "ping",
  type: "read",
  resource: "overview",
  title: "Ping",
  description: "Check that the Ticket Tailor API is responding. Does not require a credential.",
  requiresAuth: false,
  params: [],
  output: [{ key: "version", type: "string", label: "API version string" }],

  execute(_input, ctx) {
    return new TicketTailorClient(ctx).request("/ping");
  },
};

export default ping;
