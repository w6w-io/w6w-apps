import type { ActionDefinition } from "@w6w/types";
import { OBJECT_TYPE, OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/**
 * `GET /1/objects?objectID=5` — Sequences.
 *
 * Sequences have no dedicated `/Sequence(s)` endpoint of their own anywhere
 * in the reference doc (unlike Contacts, Tasks, Tags, ...), so this is the
 * second of only two places this app reaches for the generic `/objects`
 * family instead of a dedicated path.
 */
type Input = CollectionInput;

const sequenceList: ActionDefinition<Input> = {
  key: "sequence-list",
  type: "search",
  resource: "sequence",
  title: "List Sequences",
  description: "List sequences via the generic Objects endpoint (Sequence has no dedicated " +
    "endpoint of its own).",
  params: collectionParams,
  output: [{ key: "items", type: "array", label: "Sequences" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/objects", {
      query: { objectID: OBJECT_TYPE.SEQUENCE, ...collectionQuery(input) },
    });
    return { items, count };
  },
};

export default sequenceList;
