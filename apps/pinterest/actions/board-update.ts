import type { ActionDefinition } from "@w6w/types";
import { compact, PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, boardIdParam, boardUpdatePrivacyOptions } from "../lib/params.ts";

/**
 * `PATCH /v5/boards/{board_id}` — update a board's name, description or
 * privacy.
 *
 * The update body (`BoardWithUpdatePrivacyUpdate`) only accepts `PUBLIC` or
 * `SECRET` for `privacy` — Pinterest's schema does not allow updating a board
 * TO `PROTECTED`, only creating one that way. `boardUpdatePrivacyOptions` is
 * that narrower two-value list, distinct from the three-value one on
 * `board-create`.
 */
interface Input {
  boardId: string;
  name?: string;
  description?: string;
  privacy?: string;
  adAccountId?: string;
}

const boardUpdate: ActionDefinition<Input> = {
  key: "board-update",
  type: "perform",
  resource: "board",
  title: "Update Board",
  description: "Update a board's name, description or privacy.",
  idempotent: true,
  params: [
    boardIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "privacy", label: "Privacy", type: "select", options: boardUpdatePrivacyOptions },
    adAccountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "privacy", type: "string", label: "Privacy" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/boards/${encodeURIComponent(input.boardId)}`, {
      method: "PATCH",
      query: { ad_account_id: input.adAccountId },
      body: compact({
        name: input.name,
        description: input.description,
        privacy: input.privacy,
      }),
    });
  },
};

export default boardUpdate;
