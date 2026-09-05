import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /reviewers/{id}` — Get.
 *
 * `id` is Judge.me's internal reviewer id. Per the document, set it to `-1`
 * and supply `externalId` or `email` instead to find the reviewer by the
 * store platform's own id or by email.
 */
interface Input {
  id: number;
  externalId?: number;
  email?: string;
}

const getReviewer: ActionDefinition<Input> = {
  key: "get-reviewer",
  type: "read",
  resource: "reviewer",
  title: "Get Reviewer",
  description: "Fetch a reviewer's name, email and phone by Judge.me id, external id or email.",
  params: [
    {
      key: "id",
      label: "Reviewer ID",
      type: "number",
      required: true,
      default: -1,
      hint: "Judge.me's internal id. Set to -1 to look up by External ID or Email instead.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "number",
      hint: "The store platform's own reviewer/customer id. Used only when Reviewer ID is -1.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Used only when Reviewer ID is -1 and External ID is blank.",
    },
  ],
  output: [
    { key: "reviewer", type: "object", label: "Reviewer" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{ reviewer?: unknown }>(
      `/reviewers/${encodeURIComponent(String(input.id))}`,
      { query: compact({ external_id: input.externalId, email: input.email }) },
    );
    return { reviewer: body?.reviewer };
  },
};

export default getReviewer;
