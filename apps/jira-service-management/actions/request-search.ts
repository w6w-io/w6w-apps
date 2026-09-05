import type { ActionDefinition } from "@w6w/types";
import { csv, JsmClient, unset } from "../lib/client.ts";
import { pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  requestStatus?: string;
  serviceDeskId?: string;
  requestTypeId?: string;
  organizationId?: number;
  expand?: string;
  limit?: number;
  start?: number;
}

const requestSearch: ActionDefinition<Input> = {
  key: "request-search",
  type: "search",
  resource: "request",
  title: "Search Customer Requests",
  description: "List/search customer requests this connection can see, with optional filters.",
  params: [
    {
      key: "searchTerm",
      label: "Search term",
      type: "string",
      hint: "Matches request summary text.",
    },
    {
      key: "requestStatus",
      label: "Status",
      type: "select",
      options: [
        { value: "OPEN_REQUESTS", label: "Open" },
        { value: "CLOSED_REQUESTS", label: "Closed" },
        { value: "ALL_REQUESTS", label: "All" },
      ],
    },
    { key: "serviceDeskId", label: "Service Desk ID", type: "string", advanced: true },
    { key: "requestTypeId", label: "Request Type ID", type: "string", advanced: true },
    { key: "organizationId", label: "Organization ID", type: "number", advanced: true },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      advanced: true,
      placeholder: "participant,sla,status",
    },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request("/request", {
      query: {
        searchTerm: unset(input.searchTerm),
        requestStatus: unset(input.requestStatus),
        serviceDeskId: unset(input.serviceDeskId),
        requestTypeId: unset(input.requestTypeId),
        organizationId: input.organizationId,
        expand: csv(input.expand),
        start: input.start ?? 0,
        limit: input.limit ?? 50,
      },
    });
  },
};

export default requestSearch;
