import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { domainIdParam, type ListInput, listParams, listQuery } from "../lib/params.ts";

interface Input extends ListInput {
  domainId: string;
}

const domainPageList: ActionDefinition<Input> = {
  key: "domain-page-list",
  type: "search",
  resource: "page",
  title: "List Pages by Domain",
  description: "Retrieve all pages published to the given custom domain.",
  params: [domainIdParam, ...listParams()],
  output: [
    { key: "pages", type: "array", label: "Pages" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/domains/${encodeId(input.domainId)}/pages`,
      listQuery(input),
    );
  },
};

export default domainPageList;
