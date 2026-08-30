import type { ActionDefinition, Param } from "@w6w/types";
import { compact, encodeId, UnbounceClient } from "../lib/client.ts";
import { pageIdParam } from "../lib/params.ts";

/**
 * `POST /pages/{page_id}/leads` — create a lead as if a visitor had submitted
 * the page's form. Useful for a workflow that captures a submission somewhere
 * else (a chat widget, a phone call logged elsewhere) and wants it to appear
 * in Unbounce's own lead list and any integrations wired to it.
 *
 * Leads created this way carry `extra_data.created_by: "api"`, per the
 * reference — that field is read-only and set by the vendor, not sent here.
 *
 * No idempotency key of any kind is documented for this endpoint, so a retried
 * call creates a second lead.
 */
interface Input {
  pageId: string;
  variantId: string;
  submitterIp: string;
  formData: Record<string, unknown>;
  conversion?: boolean;
  visitorId?: string;
}

const params: Param[] = [
  pageIdParam,
  {
    key: "variantId",
    label: "Variant ID",
    type: "string",
    required: true,
    hint: 'The published page variant id this submission belongs to (e.g. "a").',
  },
  {
    key: "submitterIp",
    label: "Submitter IP",
    type: "string",
    required: true,
    hint: "Originating IP address of the lead.",
  },
  {
    key: "formData",
    label: "Form data",
    type: "json",
    required: true,
    hint: "Form fields and values representing the lead, e.g. " +
      '{"first_name": "John", "email": "john@example.com"}. Values may be a string or an array ' +
      "of strings for multi-value fields.",
  },
  {
    key: "conversion",
    label: "Mark as converted",
    type: "boolean",
    hint: "Whether this lead should be marked as having converted.",
  },
  {
    key: "visitorId",
    label: "Visitor ID",
    type: "string",
    hint: "Unbounce's own internal visitor id for tracking the lead, if known.",
  },
];

const pageLeadCreate: ActionDefinition<Input> = {
  key: "page-lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description:
    "Record a form submission for a page as a new lead, as if a visitor had submitted it.",
  idempotent: false,
  params,
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).post(
      `/pages/${encodeId(input.pageId)}/leads`,
      compact({
        conversion: input.conversion,
        visitor_id: input.visitorId,
        form_submission: {
          variant_id: input.variantId,
          submitter_ip: input.submitterIp,
          form_data: input.formData,
        },
      }),
    );
  },
};

export default pageLeadCreate;
