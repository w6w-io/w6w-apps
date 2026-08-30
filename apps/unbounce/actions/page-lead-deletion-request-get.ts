import type { ActionDefinition, Param } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { pageIdParam } from "../lib/params.ts";

interface Input {
  pageId: string;
  leadDeletionRequestId: string;
}

const leadDeletionRequestIdParam: Param = {
  key: "leadDeletionRequestId",
  label: "Deletion Request ID",
  type: "string",
  required: true,
  hint: "From the `id` field (or `metadata.location` URL) of a Request Lead Deletion response.",
};

const pageLeadDeletionRequestGet: ActionDefinition<Input> = {
  key: "page-lead-deletion-request-get",
  type: "read",
  resource: "lead-deletion-request",
  title: "Get Lead Deletion Request",
  description: "Retrieve the status of an in-progress or completed asynchronous lead deletion.",
  params: [pageIdParam, leadDeletionRequestIdParam],
  output: [
    { key: "id", type: "string", label: "Deletion request ID" },
    { key: "status", type: "string", label: "Status (pending, completed, or failed)" },
    { key: "total_leads_deleted", type: "number", label: "Leads deleted so far" },
    { key: "completed_at", type: "string", label: "Completed at, or null" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/pages/${encodeId(input.pageId)}/lead_deletion_request/${
        encodeId(input.leadDeletionRequestId)
      }`,
    );
  },
};

export default pageLeadDeletionRequestGet;
