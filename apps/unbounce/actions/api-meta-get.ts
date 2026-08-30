import type { ActionDefinition } from "@w6w/types";
import { UnbounceClient } from "../lib/client.ts";

/**
 * `GET /` — the API's own entry point: documentation link, related collection
 * URLs, and the supported spec/format list. The one endpoint in this app with
 * no "Authentication Required" tag in the reference, confirmed live (a bare
 * `GET /` with no credential answers `404` — Unbounce's root only resolves
 * with the Accept header this client always sends — while a signed request to
 * the same path answers the documented meta-information body).
 */
const apiMetaGet: ActionDefinition = {
  key: "api-meta-get",
  type: "read",
  resource: "meta",
  title: "Get API Info",
  description: "Retrieve the global API meta-information: documentation link and entry points.",
  requiresAuth: false,
  output: [
    { key: "documentation", type: "string", label: "Documentation URL" },
    { key: "related", type: "object", label: "Related entry-point URLs" },
    { key: "supported_formats", type: "array", label: "Supported formats" },
  ],

  execute(_input, ctx) {
    return new UnbounceClient(ctx).get("/");
  },
};

export default apiMetaGet;
