import type { ActionDefinition } from "@w6w/types";
import { RaindropClient, toIdList } from "../lib/client.ts";

/**
 * `PUT /rest/v1/collections/merge` — move several collections' contents into one.
 *
 * The source collections named in `ids` are merged into the collection named by
 * `to`; the sources do not survive as separate collections.
 *
 * **Not idempotent**, and the reason is worth stating: the operation is
 * destructive of its own inputs. After the first call the ids in `ids` no longer
 * name anything, so a retry is not "the same request again" — it is a different
 * request against a changed world, and what it does then is not documented. The
 * runtime must not replay this on a dropped connection.
 */
interface Input {
  to: number;
  ids: string | Array<number | string>;
}

const collectionMerge: ActionDefinition<Input> = {
  key: "collection-merge",
  type: "perform",
  resource: "collection",
  title: "Merge Collections",
  description: "Merge several collections into one. The merged-from collections do not survive.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "Merge into",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The collection that keeps everything.",
    },
    {
      key: "ids",
      label: "Collections to merge",
      type: "string",
      required: true,
      placeholder: "8492393, 8364483",
      hint: "Comma-separated IDs of the collections whose contents move into the target.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Merged" }],

  async execute(input, ctx) {
    const ids = toIdList(input.ids);
    if (!ids) throw new Error("Collections to merge is required");

    const body = await new RaindropClient(ctx).ok("/collections/merge", {
      method: "PUT",
      body: { to: input.to, ids },
    });
    return { result: body.result !== false };
  },
};

export default collectionMerge;
