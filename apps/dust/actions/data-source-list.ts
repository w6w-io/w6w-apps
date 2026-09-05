import type { ActionDefinition } from "@w6w/types";
import { SPACE_ID_PARAM } from "../lib/params.ts";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /spaces/{spaceId}/data_sources` — verified against the vendor's
 * OpenAPI document ("Get data sources"). Data sources (connections, folders,
 * websites) are scoped to a space — see List Spaces for the `spaceId`.
 */
interface Input {
  spaceId: string;
}

interface Output {
  data_sources: unknown[];
}

const dataSourceList: ActionDefinition<Input, Output> = {
  key: "data-source-list",
  type: "read",
  resource: "data-source",
  title: "List Data Sources",
  description: "List the data sources (folders, connections, websites) in a space.",
  params: [SPACE_ID_PARAM],
  output: [{ key: "data_sources", type: "array", label: "Data sources" }],

  execute(input, ctx) {
    return new DustClient(ctx).json<Output>(
      `/spaces/${encodeURIComponent(input.spaceId)}/data_sources`,
    );
  },
};

export default dataSourceList;
