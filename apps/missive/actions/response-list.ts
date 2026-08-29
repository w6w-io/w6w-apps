import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  organization?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/responses` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Responses, 2026-08-29.
 *
 * "Responses" are Missive's canned/template replies. Inline images in `body`
 * carry no `src`, only a `data-missive-attachment-id` — the actual URL is in
 * the `attachments` array.
 */
const action: ActionDefinition<Input> = {
  key: "response-list",
  type: "read",
  resource: "response",
  title: "List Canned Responses",
  description: "List canned responses (Missive's saved-reply templates) for the authenticated " +
    "user.",
  params: [
    { key: "organization", label: "Organization ID", type: "string", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "responses", type: "array", label: "Canned Responses" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ responses: unknown[] }>("/responses", {
      query: compact({
        organization: input.organization,
        limit: input.limit,
        offset: input.offset,
      }),
    });
    return res.responses;
  },
};

export default action;
