import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag, stripSecrets } from "../lib/client.ts";
import { descParam, ownershipParam, paginationParams, unnamedParam } from "../lib/params.ts";

/**
 * `GET /v2/key-value-stores` — the account's key-value stores.
 *
 * Same default as the dataset list, and the same surprise: **named stores only**
 * unless unnamed ones are explicitly included, and every store a run creates for
 * itself is unnamed. An account full of runs shows an empty list.
 *
 * List items are a reduced projection and carry no `urlSigningSecretKey` today.
 * The strip is applied to them anyway, for the same reason as in List Datasets:
 * the rule is about the shape, not about which action remembered.
 */
interface Input {
  unnamed?: boolean;
  ownership?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

const keyValueStoreList: ActionDefinition<Input> = {
  key: "key-value-store-list",
  type: "search",
  resource: "key-value-store",
  title: "List Key-Value Stores",
  description: "List the account's key-value stores. Named ones only, unless unnamed are included.",
  params: [
    unnamedParam,
    ownershipParam,
    descParam,
    ...paginationParams(100, "Apify's own default and maximum is 1000; 100 is prefilled here."),
  ],
  output: [
    { key: "items", type: "array", label: "Key-value stores" },
    { key: "total", type: "number", label: "Total matching stores" },
    { key: "count", type: "number", label: "Stores in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  async execute(input, ctx) {
    const page = await new ApifyClient(ctx).data<ApifyListPage<unknown>>("/key-value-stores", {
      query: {
        unnamed: flag(input.unnamed),
        ownership: input.ownership,
        desc: flag(input.desc),
        limit: input.limit,
        offset: input.offset,
      },
    });
    return { ...page, items: (page?.items ?? []).map((item) => stripSecrets(item)) };
  },
};

export default keyValueStoreList;
