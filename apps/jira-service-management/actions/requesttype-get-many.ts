import type { ActionDefinition } from "@w6w/types";
import { JsmClient, unset } from "../lib/client.ts";
import { pagedOutput, pagination, serviceDeskId } from "../lib/params.ts";

interface Input {
  serviceDeskId: string;
  searchQuery?: string;
  groupId?: string;
  limit?: number;
  start?: number;
}

const requesttypeGetMany: ActionDefinition<Input> = {
  key: "requesttype-get-many",
  type: "search",
  resource: "requesttype",
  title: "List Request Types",
  description: "List the request types offered by a service desk, optionally filtered.",
  params: [
    serviceDeskId,
    {
      key: "searchQuery",
      label: "Search",
      type: "string",
      hint: "Matches against the request type's name and description.",
    },
    { key: "groupId", label: "Request type group ID", type: "string", advanced: true },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/servicedesk/${encodeURIComponent(input.serviceDeskId)}/requesttype`,
      {
        query: {
          searchQuery: unset(input.searchQuery),
          groupId: unset(input.groupId),
          start: input.start ?? 0,
          limit: input.limit ?? 50,
        },
      },
    );
  },
};

export default requesttypeGetMany;
