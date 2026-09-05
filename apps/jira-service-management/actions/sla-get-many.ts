import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { issueIdOrKey, pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  limit?: number;
  start?: number;
}

const slaGetMany: ActionDefinition<Input> = {
  key: "sla-get-many",
  type: "search",
  resource: "sla",
  title: "Get SLA Information",
  description: "List the SLAs tracked on a request, with ongoing and completed cycle timing.",
  params: [issueIdOrKey, ...pagination],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/sla`,
      { query: { start: input.start ?? 0, limit: input.limit ?? 50 } },
    );
  },
};

export default slaGetMany;
