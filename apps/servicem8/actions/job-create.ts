import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceM8Client } from "../lib/client.ts";
import { jobStatusOptions } from "../lib/params.ts";

/**
 * `POST /job.json` — create a Job. `status` is the only field the reference
 * marks `required` on `JobCreate`.
 *
 * The response carries no record data — only `{errorCode, message}` plus the
 * new row's uuid in the `x-record-uuid` response header (see `lib/client.ts`).
 * Follow up with `job-get` for the full record.
 */
interface Input {
  status: string;
  companyUuid?: string;
  categoryUuid?: string;
  jobAddress?: string;
  billingAddress?: string;
  jobDescription?: string;
  purchaseOrderNumber?: string;
  queueUuid?: string;
}

const jobCreate: ActionDefinition<Input, { uuid?: string }> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a Job (Quote / Work Order). Returns only the new UUID — fetch the full " +
    "record with Get Job if you need it back.",
  idempotent: false,
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: jobStatusOptions,
    },
    { key: "companyUuid", label: "Client (Company) UUID", type: "string" },
    { key: "categoryUuid", label: "Category UUID", type: "string" },
    { key: "jobAddress", label: "Job address", type: "string" },
    { key: "billingAddress", label: "Billing address", type: "string" },
    { key: "jobDescription", label: "Job description", type: "text" },
    { key: "purchaseOrderNumber", label: "Purchase order number", type: "string" },
    { key: "queueUuid", label: "Queue UUID", type: "string" },
  ],
  output: [{ key: "uuid", type: "string", label: "New Job UUID (x-record-uuid)" }],

  async execute(input, ctx) {
    const { uuid } = await new ServiceM8Client(ctx).create(
      "/job.json",
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
    return { uuid };
  },
};

export default jobCreate;
