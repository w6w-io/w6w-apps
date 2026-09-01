import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/**
 * `GET /projects/{project_id}/webhooks` — the project's webhooks.
 *
 * The response includes each webhook's `secret`, used to verify delivery
 * signatures — genuinely needed by whoever wires up the receiving endpoint,
 * unlike Apify's `proxy.password` or Follow Up Boss's `/me`, so it is
 * returned rather than stripped. Treat this action's result as sensitive.
 */
interface Input {
  projectId: string;
  limit?: number;
  page?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the project's webhooks. The result includes each webhook's signing secret — treat it " +
    "as sensitive.",
  params: [projectIdParam, ...paginationParams(100).filter((p) => p.key !== "cursor")],
  output: [
    { key: "items", type: "array", label: "Webhooks" },
    { key: "totalCount", type: "number", label: "Total webhooks" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/webhooks`,
      "webhooks",
      { query: paginationQuery(input) },
    );
    return { items, totalCount };
  },
};

export default webhookList;
