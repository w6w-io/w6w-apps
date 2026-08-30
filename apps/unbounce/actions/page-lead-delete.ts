import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { leadIdParam, pageIdParam } from "../lib/params.ts";

/**
 * `DELETE /pages/{page_id}/leads/{lead_id}` — permanently delete a single
 * lead. The reference states plainly: "Only available to the account owner.
 * **NOTE: this endpoint cannot be used with API keys (OAuth only)**" — an
 * API Key connection will be refused here even though it can read and list
 * leads freely. Connect with the OAuth method (`../auth/oauth2.ts`) to use
 * this action.
 */
interface Input {
  pageId: string;
  leadId: string;
}

const pageLeadDelete: ActionDefinition<Input> = {
  key: "page-lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description:
    "Permanently delete a single lead. Deleted leads cannot be recovered. Requires an OAuth " +
    "connection and account-owner permissions — an API Key connection is refused here.",
  idempotent: true,
  params: [pageIdParam, leadIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new UnbounceClient(ctx).delete(
      `/pages/${encodeId(input.pageId)}/leads/${encodeId(input.leadId)}`,
    );
    return { status };
  },
};

export default pageLeadDelete;
