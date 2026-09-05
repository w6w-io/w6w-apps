import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `PUT /reviewers/{id}` — Update (create or update).
 *
 * Same `id`/`externalId`/`email` lookup as `get-reviewer`; the path's shared
 * `parameters` block documents all three against both `GET` and `PUT`. The
 * request body's `id` field (inside `RequestReviewer`) is the reviewer's
 * EXTERNAL id — a different meaning than the path's `{id}}`, which is
 * Judge.me's internal id — matching the document's own "Judge.me ID vs
 * External ID" note that a request body's `id` means the external id while a
 * URL's `id` means Judge.me's internal one.
 */
interface Input {
  id: number;
  externalId?: number;
  email?: string;
  reviewerExternalId?: number;
  reviewerEmail: string;
  name: string;
  phone?: string;
  tags?: string;
}

const updateReviewer: ActionDefinition<Input> = {
  key: "update-reviewer",
  type: "perform",
  resource: "reviewer",
  title: "Create or Update Reviewer",
  description:
    "Create a reviewer if none matches, or update the one found by id/external id/email.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Reviewer ID (path)",
      type: "number",
      required: true,
      default: -1,
      hint: "Judge.me's internal id to update. Set to -1 to find by External ID or Email instead.",
    },
    {
      key: "externalId",
      label: "External ID (lookup)",
      type: "number",
      hint: "Used only when Reviewer ID is -1.",
    },
    {
      key: "email",
      label: "Email (lookup)",
      type: "string",
      hint: "Used only when Reviewer ID is -1 and External ID is blank.",
    },
    {
      key: "reviewerExternalId",
      label: "Reviewer External ID (body)",
      type: "number",
      advanced: true,
      hint: "The store platform's own id for this reviewer, written into the reviewer record.",
    },
    { key: "reviewerEmail", label: "Reviewer Email", type: "string", required: true },
    { key: "name", label: "Reviewer Name", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: 'Comma-separated, e.g. "vip, repeat-buyer".',
    },
  ],
  output: [
    { key: "reviewer", type: "object", label: "Reviewer" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{ reviewer?: unknown }>(
      `/reviewers/${encodeURIComponent(String(input.id))}`,
      {
        method: "PUT",
        query: compact({ external_id: input.externalId, email: input.email }),
        body: {
          reviewer: compact({
            id: input.reviewerExternalId,
            email: input.reviewerEmail,
            name: input.name,
            phone: input.phone,
            tags: input.tags,
          }),
        },
      },
    );
    return { reviewer: body?.reviewer };
  },
};

export default updateReviewer;
