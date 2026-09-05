import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam } from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/tags` — every tag ever applied
 * to a subscriber on this list.
 *
 * **Answers a bare JSON array of strings** (`["alpha", "beta"]`), unlike
 * every other collection in this API, which wraps its items in
 * `{"entries": [...]}`. This action returns that array as-is under
 * `tags` rather than forcing it into the `entries` shape everything else
 * uses, so a workflow reading this action's output does not have to guess
 * which convention applied.
 */
interface Input {
  accountId: string;
  listId: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List every tag that has been applied to a subscriber on this list.",
  params: [accountIdParam, listIdParam],
  output: [{ key: "tags", type: "array", label: "Tags" }],

  async execute(input, ctx) {
    const tags = await new AweberClient(ctx).json<string[]>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/tags`,
    );
    return { tags: tags ?? [] };
  },
};

export default tagList;
