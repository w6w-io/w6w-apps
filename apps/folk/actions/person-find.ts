import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  query: string;
}

/**
 * `GET /network/{networkId}/group/{groupId}/person/find/{query}` — the
 * search term is a PATH segment, not a query-string parameter, despite the
 * name. The OAS documents no description of what `query` matches against
 * (name vs. email vs. both); it is URL-encoded here since it is user-typed
 * free text that may contain `@`, spaces, etc.
 */
const personFind: ActionDefinition<Input> = {
  key: "person-find",
  type: "read",
  resource: "person",
  title: "Find Person",
  description: "Find a person in a group by a free-text query (folk does not document exactly " +
    "which fields it matches against).",
  params: [
    groupIdParam,
    { key: "query", label: "Query", type: "string", required: true },
  ],
  output: [{ key: "person", type: "object", label: "The matching person" }],

  async execute(input, ctx) {
    const person = await new FolkClient(ctx).request(
      networkPath(
        `/group/${encodeURIComponent(input.groupId)}/person/find/${
          encodeURIComponent(input.query)
        }`,
      ),
    );
    return { person };
  },
};

export default personFind;
