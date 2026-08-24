import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/** `GET /queue.json` — list Job Queues (the dispatch board's unassigned-work lanes). */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const queueList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "queue-list",
  type: "search",
  resource: "queue",
  title: "Find Job Queues",
  description: "List Job Queues, with optional $filter/$sort and cursor pagination.",
  params: listParams(),
  output: listOutput("Job Queues"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/queue.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default queueList;
