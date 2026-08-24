import type { ActionDefinition } from "@w6w/types";
import { encodeId, ServiceM8Client } from "../lib/client.ts";

/**
 * `DELETE /job/{uuid}.json` — the reference's own words are "successfully
 * archived (soft deleted)": this sets `active` to `0`, it does not erase the
 * record. A direct `GET .../{uuid}.json` still returns it afterwards. Safe to
 * retry, since archiving an already-archived Job is a no-op.
 */
interface Input {
  jobUuid: string;
}

const jobDelete: ActionDefinition<Input, { errorCode?: number; message?: string }> = {
  key: "job-delete",
  type: "perform",
  resource: "job",
  title: "Archive Job",
  description: "Soft-delete (archive) a Job — sets active=0. Does not erase the record.",
  idempotent: true,
  params: [
    { key: "jobUuid", label: "Job UUID", type: "string", required: true },
  ],
  output: [
    { key: "errorCode", type: "number", label: "0 on success" },
    { key: "message", type: "string", label: 'ServiceM8\'s own message, "OK" on success' },
  ],

  execute(input, ctx) {
    return new ServiceM8Client(ctx).archive(`/job/${encodeId(input.jobUuid)}.json`);
  },
};

export default jobDelete;
