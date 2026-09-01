import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";
import { businessFilters, page, perPage } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  filters?: unknown;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List projects.",
  params: [page, perPage, businessFilters],
  output: [{ key: "projects", type: "array", label: "Projects" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("projects", "/projects", {
      query: {
        page: input.page ?? 1,
        per_page: input.perPage,
        ...jsonObject(input.filters, "filters"),
      },
    });
  },
};

export default projectList;
