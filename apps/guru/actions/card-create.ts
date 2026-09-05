import type { ActionDefinition } from "@w6w/types";
import { compact, GuruClient, stripTokens, toList } from "../lib/client.ts";
import { shareStatusParam } from "../lib/params.ts";

/**
 * `POST /api/v1/cards/extended` — create a Card.
 *
 * Guru's own description of this endpoint: "Content and title are required.
 * Card share status should be set to TEAM to make a card team shared.
 * Omitting the share status value or setting it to PRIVATE will result in a
 * card that is only accessible by the card owner." That default is preserved
 * here rather than defaulted to TEAM, so a workflow author who forgets the
 * field gets Guru's own private-by-default behavior, not a surprise publish.
 *
 * `folderIds` files the new Card into one or more existing Folders at
 * creation time — Guru's `NewCard.folderIds`, not a separate "add to folder"
 * call.
 *
 * Requires a **User token** — a Collection token is read-only and this call
 * will fail with 403 (see `lib/client.ts`).
 */
interface Input {
  title: string;
  content: string;
  collectionId?: string;
  folderIds?: string[] | string;
  shareStatus?: string;
}

const cardCreate: ActionDefinition<Input> = {
  key: "card-create",
  type: "perform",
  resource: "card",
  title: "Create Card",
  description: "Create a new Card. Requires a User token — a Collection token cannot write.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Guru's preferredPhrase.",
    },
    { key: "content", label: "Content", type: "text", required: true, hint: "HTML or Markdown." },
    {
      key: "collectionId",
      label: "Collection ID",
      type: "string",
      hint: "Which Collection this Card belongs to. Leave empty to use the account's default.",
    },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "string",
      hint: "Comma-separated Folder IDs to file the new Card into.",
    },
    shareStatusParam,
  ],
  output: [{ key: "data", type: "object", label: "The created Card" }],

  async execute(input, ctx) {
    const body = compact({
      preferredPhrase: input.title,
      content: input.content,
      collection: input.collectionId ? { id: input.collectionId } : undefined,
      folderIds: toList(input.folderIds),
      shareStatus: input.shareStatus,
    });
    const card = await new GuruClient(ctx).json<Record<string, unknown>>("/cards/extended", {
      method: "POST",
      body,
    });
    return stripTokens(card);
  },
};

export default cardCreate;
