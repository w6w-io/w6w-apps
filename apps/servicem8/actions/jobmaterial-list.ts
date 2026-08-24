import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /jobmaterial.json` — list Job Materials: line items on a Job's Quote or
 * Invoice (`rest-overview.md`'s naming table: "Line items on a quote/invoice"
 * -> `JobMaterial`).
 */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const jobMaterialList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "jobmaterial-list",
  type: "search",
  resource: "jobmaterial",
  title: "Find Job Materials",
  description: "List Job Materials — the line items on a Job's Quote/Invoice.",
  params: listParams(),
  output: listOutput("Job Materials"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/jobmaterial.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default jobMaterialList;
