import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `DELETE /v2/campaigns` — deletes one or more campaigns by ID, or filters
 * by status/title, or deletes them all via the literal string `"all"`.
 */
interface Input {
  ids?: string[] | string;
  status?: string;
  title?: string;
}

const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description:
    'Delete one or more campaigns by ID. Pass "all" as the only ID to delete every campaign ' +
    "in the account.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Campaign IDs",
      type: "multiselect",
      hint: 'Campaign IDs to delete, or the single value "all" to delete every campaign.',
    },
    { key: "status", label: "Status filter", type: "string" },
    { key: "title", label: "Title filter", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const ids = Array.isArray(input.ids) ? input.ids : (input.ids ? [input.ids] : undefined);
    return new SenderClient(ctx).data("/campaigns", {
      method: "DELETE",
      query: { ids },
      body: compact({ status: input.status, title: input.title }),
    });
  },
};

export default campaignDelete;
