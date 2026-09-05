import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  limit?: number;
  start?: number;
}

const servicedeskGetMany: ActionDefinition<Input> = {
  key: "servicedesk-get-many",
  type: "search",
  resource: "servicedesk",
  title: "List Service Desks",
  description: "List the service desks this connection can access.",
  params: [...pagination],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request("/servicedesk", {
      query: { start: input.start ?? 0, limit: input.limit ?? 50 },
    });
  },
};

export default servicedeskGetMany;
