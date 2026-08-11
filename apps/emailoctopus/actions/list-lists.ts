import type { ActionDefinition } from "@w6w/types";
import {
  EmailOctopusClient,
  type Page,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

/**
 * `GET /lists` — the account's lists, one cursor page at a time.
 *
 * This is also the endpoint the auth `test` hook and the quota probe use: it is
 * the only collection in the v2 API that needs no id to reach, and the v2 spec
 * publishes no account/whoami endpoint at all.
 */
const listLists: ActionDefinition<Input> = {
  key: "list-lists",
  type: "search",
  resource: "list",
  title: "List Lists",
  description:
    "Fetch one cursor page of the account's lists. Each list carries its `fields`, `tags` and a `counts` breakdown of pending/subscribed/unsubscribed contacts.",
  params: [...PAGE_PARAMS],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request<Page>("/lists", { query: pageQuery(input) });
  },
};

export default listLists;
