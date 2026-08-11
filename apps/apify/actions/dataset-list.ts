import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag, stripSecrets } from "../lib/client.ts";
import { descParam, ownershipParam, paginationParams, unnamedParam } from "../lib/params.ts";

/**
 * `GET /v2/datasets` — the account's datasets.
 *
 * ## Only *named* datasets, by default
 *
 * This is the finding that makes this endpoint look broken. Apify returns named
 * storages only unless `unnamed=1` is passed — and every dataset an Actor run
 * creates for itself is unnamed. An account with a thousand runs and no named
 * datasets gets an empty list, correctly, and reads it as a bug.
 *
 * The same is true of the key-value-store and request-queue lists.
 *
 * Unnamed storages are also the ones that expire: they follow the plan's data
 * retention period, where a named one is kept indefinitely.
 *
 * The list items are a reduced projection (`id`, `name`, `itemCount`,
 * timestamps, …) and do **not** carry `urlSigningSecretKey` today. The strip is
 * applied to them anyway, so that the rule is "anything shaped like a dataset
 * gets stripped" rather than "these three actions remembered to" — the second
 * kind of rule is the kind that quietly stops being true when a vendor widens a
 * projection.
 */
interface Input {
  unnamed?: boolean;
  ownership?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

const datasetList: ActionDefinition<Input> = {
  key: "dataset-list",
  type: "search",
  resource: "dataset",
  title: "List Datasets",
  description: "List the account's datasets. Named ones only, unless unnamed are included.",
  params: [
    unnamedParam,
    ownershipParam,
    descParam,
    ...paginationParams(100, "Apify's own default and maximum is 1000; 100 is prefilled here."),
  ],
  output: [
    { key: "items", type: "array", label: "Datasets" },
    { key: "total", type: "number", label: "Total matching datasets" },
    { key: "count", type: "number", label: "Datasets in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  async execute(input, ctx) {
    const page = await new ApifyClient(ctx).data<ApifyListPage<unknown>>("/datasets", {
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

export default datasetList;
