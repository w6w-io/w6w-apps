import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { pagedOutput, pagination, serviceDeskId } from "../lib/params.ts";

interface Input {
  serviceDeskId: string;
  queueId: string;
  limit?: number;
  start?: number;
}

const queueGetIssues: ActionDefinition<Input> = {
  key: "queue-get-issues",
  type: "search",
  resource: "queue",
  title: "Get Issues In Queue",
  description: "List the requests currently sitting in one of a service desk's queues.",
  params: [
    serviceDeskId,
    {
      key: "queueId",
      label: "Queue ID",
      type: "string",
      required: true,
      hint: "From `queue-get-many`.",
    },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/servicedesk/${encodeURIComponent(input.serviceDeskId)}/queue/${
        encodeURIComponent(input.queueId)
      }/issue`,
      { query: { start: input.start ?? 0, limit: input.limit ?? 50 } },
    );
  },
};

export default queueGetIssues;
