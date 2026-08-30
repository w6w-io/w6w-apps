import type { ActionDefinition, Param } from "@w6w/types";
import { compact, encodeId, UnbounceClient } from "../lib/client.ts";
import { pageIdParam } from "../lib/params.ts";

/**
 * `POST /pages/{page_id}/lead_deletion_request` — asynchronously delete one or
 * more leads for a page. Like `page-lead-delete`, the reference states this
 * "endpoint cannot be used with API keys (OAuth only)" and is "only available
 * to the account owner." Deleted leads cannot be recovered.
 *
 * Three mutually-exclusive ways to select what gets deleted, per the vendor's
 * own schema description: an explicit `lead_ids` list; `all_leads: true` for
 * every lead on the page; or a `from`/`to` date-time range. No idempotency key
 * is documented, so a retried call creates a second deletion request — poll
 * its status with `page-lead-deletion-request-get` rather than resubmitting.
 */
interface Input {
  pageId: string;
  leadIds?: string;
  allLeads?: boolean;
  from?: string;
  to?: string;
}

const params: Param[] = [
  pageIdParam,
  {
    key: "leadIds",
    label: "Lead IDs",
    type: "string",
    hint: "Comma-separated lead ids to delete. Missing ids are skipped silently, no error is " +
      'reported. Leave empty when using "Delete all leads" or a date range instead.',
  },
  {
    key: "allLeads",
    label: "Delete all leads",
    type: "boolean",
    hint: "When set and no Lead IDs are provided, deletes every lead on this page.",
  },
  {
    key: "from",
    label: "Created after",
    type: "datetime",
    hint: "Restrict the deletion to leads created after this date-time.",
  },
  {
    key: "to",
    label: "Created before",
    type: "datetime",
    hint: "Restrict the deletion to leads created before this date-time.",
  },
];

const pageLeadDeletionRequestCreate: ActionDefinition<Input> = {
  key: "page-lead-deletion-request-create",
  type: "perform",
  resource: "lead-deletion-request",
  title: "Request Lead Deletion",
  description:
    "Create an asynchronous request to delete one or more leads for a page. Requires an OAuth " +
    "connection and account-owner permissions — an API Key connection is refused here. Deleted " +
    "leads cannot be recovered.",
  idempotent: false,
  params,
  output: [
    { key: "id", type: "string", label: "Deletion request ID" },
    { key: "status", type: "string", label: "Status (pending, completed, or failed)" },
    { key: "total_leads_deleted", type: "number", label: "Leads deleted so far" },
  ],

  execute(input, ctx) {
    const leadIds = (input.leadIds ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return new UnbounceClient(ctx).post(
      `/pages/${encodeId(input.pageId)}/lead_deletion_request`,
      compact({
        lead_ids: leadIds.length > 0 ? leadIds : undefined,
        all_leads: input.allLeads,
        from: input.from,
        to: input.to,
      }),
    );
  },
};

export default pageLeadDeletionRequestCreate;
