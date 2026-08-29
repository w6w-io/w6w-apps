import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  organization?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/shared_labels` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Shared labels,
 * 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "shared-label-list",
  type: "read",
  resource: "shared-label",
  title: "List Shared Labels",
  description: "List shared labels in organizations the authenticated user has access to.",
  params: [
    { key: "organization", label: "Organization ID", type: "string", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "shared_labels", type: "array", label: "Shared Labels" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ shared_labels: unknown[] }>(
      "/shared_labels",
      {
        query: compact({
          organization: input.organization,
          limit: input.limit,
          offset: input.offset,
        }),
      },
    );
    return res.shared_labels;
  },
};

export default action;
