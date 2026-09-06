import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

/** `GET /jobs/{id}` — poll the status of an async job (e.g. a bulk registration). */
interface Input {
  id: string;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Retrieve an async job's status — poll after a bulk registration.",
  params: [{ key: "id", label: "Job ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/jobs/${encodeURIComponent(input.id)}`,
    );
    return res.data;
  },
};

export default jobGet;
