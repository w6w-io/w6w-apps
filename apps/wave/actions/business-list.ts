import type { ActionDefinition } from "@w6w/types";
import { PAGE_INFO, WaveClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageSize?: number;
}

const QUERY = `
  query ListBusinesses($page: Int, $pageSize: Int) {
    businesses(page: $page, pageSize: $pageSize) {
      ${PAGE_INFO}
      edges {
        node {
          id
          name
          isPersonal
          currency { code }
        }
      }
    }
  }
`;

const businessList: ActionDefinition<Input> = {
  key: "business-list",
  type: "search",
  resource: "business",
  title: "List Businesses",
  description:
    "List the Wave businesses the connected user belongs to. Every other action needs one of these ids.",
  params: [
    { key: "page", label: "Page", type: "number", default: 1, hint: "1-based." },
    { key: "pageSize", label: "Page size", type: "number", default: 20 },
  ],
  output: [
    { key: "edges", type: "array", label: "Businesses, each wrapped in a `node`" },
    { key: "pageInfo", type: "object", label: "currentPage / totalPages / totalCount" },
  ],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<{ businesses: unknown }>(QUERY, {
      page: input.page,
      pageSize: input.pageSize,
    });
    return data.businesses;
  },
};

export default businessList;
