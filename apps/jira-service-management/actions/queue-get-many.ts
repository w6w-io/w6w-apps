import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { pagedOutput, pagination, serviceDeskId } from "../lib/params.ts";

interface Input {
  serviceDeskId: string;
  includeCount?: boolean;
  limit?: number;
  start?: number;
}

const queueGetMany: ActionDefinition<Input> = {
  key: "queue-get-many",
  type: "search",
  resource: "queue",
  title: "List Queues",
  description: "List a service desk's queues.",
  params: [
    serviceDeskId,
    {
      key: "includeCount",
      label: "Include issue counts",
      type: "boolean",
      hint: "Costs an extra count query per queue — leave off for a faster listing.",
    },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/servicedesk/${encodeURIComponent(input.serviceDeskId)}/queue`,
      {
        query: {
          includeCount: input.includeCount,
          start: input.start ?? 0,
          limit: input.limit ?? 50,
        },
      },
    );
  },
};

export default queueGetMany;
