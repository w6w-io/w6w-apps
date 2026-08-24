import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/** `GET /category.json` — list Job Categories. */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const categoryList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "Find Categories",
  description: "List Job Categories, with optional $filter/$sort and cursor pagination.",
  params: listParams(),
  output: listOutput("Categories"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/category.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default categoryList;
