import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /company.json` — list Clients. `Company` is the REST resource name for
 * what the ServiceM8 UI calls a Client/Customer (`rest-overview.md`'s own
 * naming table); the operationId is even `listClients`.
 */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const companyList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "Find Clients",
  description: "List Clients (the Company resource), with optional $filter/$sort and cursor " +
    "pagination.",
  params: listParams(),
  output: listOutput("Clients"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/company.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default companyList;
