import type { ActionDefinition } from "@w6w/types";
import { encodeId, ServiceM8Client } from "../lib/client.ts";

/** `GET /job/{uuid}.json` — retrieve a single Job. */
interface Input {
  jobUuid: string;
}

const jobGet: ActionDefinition<Input, unknown> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Retrieve a single Job by UUID.",
  params: [
    { key: "jobUuid", label: "Job UUID", type: "string", required: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "Job UUID" },
    {
      key: "status",
      type: "string",
      label: "Status (Quote / Work Order / Unsuccessful / Completed)",
    },
    { key: "company_uuid", type: "string", label: "Client (Company) UUID" },
    { key: "job_address", type: "string", label: "Job address" },
    { key: "active", type: "number", label: "1 if active, 0 if archived" },
  ],

  execute(input, ctx) {
    return new ServiceM8Client(ctx).json(`/job/${encodeId(input.jobUuid)}.json`);
  },
};

export default jobGet;
