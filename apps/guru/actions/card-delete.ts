import type { ActionDefinition } from "@w6w/types";
import { GuruClient } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/v1/cards/{cardId}` — permanently delete a Card.
 *
 * Guru documents no "trash" or restore for a Card delete (unlike its Folder
 * item soft-delete elsewhere in the product UI), so this is not reversible
 * through the API. Requires a **User token**.
 */
interface Input {
  cardId: string;
}

const cardDelete: ActionDefinition<Input> = {
  key: "card-delete",
  type: "perform",
  resource: "card",
  title: "Delete Card",
  description: "Permanently delete a Card. Not reversible through the API.",
  idempotent: true,
  params: [cardIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Whether the delete request succeeded" }],

  async execute(input, ctx) {
    await new GuruClient(ctx).json(`/cards/${encodeURIComponent(input.cardId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default cardDelete;
