import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, ServiceM8Client } from "../lib/client.ts";
import { jobStatusOptions } from "../lib/params.ts";

/**
 * `POST /job/{uuid}.json` — update a Job.
 *
 * The reference points this operation at the identical `JobCreate` schema
 * used by create — `required: ["status"]` included — rather than a separate
 * partial-update schema. Whether the API actually enforces that requirement
 * on an update (vs. only validating fields you send) is not stated anywhere
 * in the document, so `status` is offered here but left optional; only the
 * fields you fill in are sent.
 */
interface Input {
  jobUuid: string;
  status?: string;
  companyUuid?: string;
  categoryUuid?: string;
  jobAddress?: string;
  billingAddress?: string;
  jobDescription?: string;
  purchaseOrderNumber?: string;
  queueUuid?: string;
}

const jobUpdate: ActionDefinition<Input, { errorCode?: number; message?: string }> = {
  key: "job-update",
  type: "perform",
  resource: "job",
  title: "Update Job",
  description: "Update fields on an existing Job. Only the fields you set here are sent.",
  idempotent: true,
  params: [
    { key: "jobUuid", label: "Job UUID", type: "string", required: true },
    { key: "status", label: "Status", type: "select", options: jobStatusOptions },
    { key: "companyUuid", label: "Client (Company) UUID", type: "string" },
    { key: "categoryUuid", label: "Category UUID", type: "string" },
    { key: "jobAddress", label: "Job address", type: "string" },
    { key: "billingAddress", label: "Billing address", type: "string" },
    { key: "jobDescription", label: "Job description", type: "text" },
    { key: "purchaseOrderNumber", label: "Purchase order number", type: "string" },
    { key: "queueUuid", label: "Queue UUID", type: "string" },
  ],
  output: [
    { key: "errorCode", type: "number", label: "0 on success" },
    { key: "message", type: "string", label: 'ServiceM8\'s own message, "OK" on success' },
  ],

  execute(input, ctx) {
    return new ServiceM8Client(ctx).update(
      `/job/${encodeId(input.jobUuid)}.json`,
      compact({
        status: input.status,
        company_uuid: input.companyUuid,
        category_uuid: input.categoryUuid,
        job_address: input.jobAddress,
        billing_address: input.billingAddress,
        job_description: input.jobDescription,
        purchase_order_number: input.purchaseOrderNumber,
        queue_uuid: input.queueUuid,
      }),
    );
  },
};

export default jobUpdate;
