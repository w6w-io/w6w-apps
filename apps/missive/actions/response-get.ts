import type { ActionDefinition } from "@w6w/types";
import { MissiveClient, unwrapSingle } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /v1/responses/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Responses, 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "response-get",
  type: "read",
  resource: "response",
  title: "Get Canned Response",
  description: "Fetch a single canned response by ID.",
  params: [
    { key: "id", label: "Response ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "body", type: "string", label: "HTML Body" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ responses: unknown }>(
      `/responses/${encodeURIComponent(input.id)}`,
    );
    return unwrapSingle(res.responses);
  },
};

export default action;
