import type { ActionDefinition } from "@w6w/types";
import {
  EmailOctopusClient,
  type Page,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  seg,
} from "../lib/client.ts";

interface Input extends PageInput {
  listId: string;
}

/**
 * `GET /lists/{list_id}/tags`.
 *
 * Tags are **scoped to a list**, not to the account — there is no
 * `/tags` collection in the v2 API. Each row is a bare `{ "tag": "vip" }`;
 * there is no id and no counter, so the tag string is the identity.
 */
const listTags: ActionDefinition<Input> = {
  key: "list-tags",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description:
    "Fetch one cursor page of the tags defined on a list. Tags belong to a list, not to the account, and each row is just `{ tag }`.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request<Page>(`/lists/${seg(input.listId)}/tags`, {
      query: pageQuery(input),
    });
  },
};

export default listTags;
