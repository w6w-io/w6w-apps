import type { ActionDefinition } from "@w6w/types";
import { joinIds, MissiveClient } from "../lib/client.ts";

interface Input {
  ids: string;
}

/**
 * `DELETE /v1/responses/:id1,:id2,...` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Responses, 2026-08-29.
 *
 * Accepts one or more comma-separated ids. In organizations with restricted
 * response management enabled (an enterprise feature), only admins/owners can
 * delete organization responses. Responses created by an external integration
 * (e.g. a WhatsApp template) cannot be deleted through this endpoint.
 */
const action: ActionDefinition<Input> = {
  key: "response-delete",
  type: "perform",
  resource: "response",
  title: "Delete Canned Response(s)",
  description: "Delete one or more canned responses. Organization-restricted response " +
    "management (enterprise) limits this to admins/owners; externally-sourced responses " +
    "(e.g. WhatsApp templates) cannot be deleted here.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Response ID(s)",
      type: "string",
      required: true,
      hint: "Comma-separated for multiple.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Missive canned response(s)", { ids: input.ids });
    const status = await new MissiveClient(ctx).status(`/responses/${joinIds(input.ids)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default action;
