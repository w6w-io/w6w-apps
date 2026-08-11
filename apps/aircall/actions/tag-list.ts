import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";
import {
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

type Input = PaginationInput;

/**
 * `GET /v1/tags` — the company's call Tags.
 *
 * This is the lookup table the Tag Call and Search Calls actions need: both take
 * **Tag IDs**, never names, so a workflow that tags by name has to resolve it
 * here first.
 *
 * A Tag is `{id, name, color, description}` — `color` is a hex string, and
 * `description` is described as a field "used by Aircall to qualify Tags", not a
 * user note.
 */
const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description:
    "List the company's call Tags with their IDs and colours — the lookup that turns a tag name " +
    "into the ID that Tag Call and Search Calls require.",
  params: paginationParams(),
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/tags", "tags", {
      query: paginationQuery(input),
    });
    return listResult(meta, items);
  },
};

export default tagList;
