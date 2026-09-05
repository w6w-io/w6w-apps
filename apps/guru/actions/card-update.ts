import type { ActionDefinition } from "@w6w/types";
import { compact, GuruClient, stripTokens, toList } from "../lib/client.ts";
import { cardIdParam, shareStatusParam } from "../lib/params.ts";

/**
 * `PUT /api/v1/cards/{cardId}/extended` — replace a Card's title, content,
 * share status and Folder placement.
 *
 * Guru's own description: "Content and title are required... If tags are
 * omitted or an empty list, then all existing tags will be removed." This
 * action does not expose `tags` at all — the `Tag` objects Guru's schema
 * expects are looked up by ID from `teams/{teamId}/tagcategories`, a
 * subsystem this app does not otherwise cover, and guessing at the shape
 * would risk silently clearing every tag on the Card per that same sentence.
 * Manage tags from Guru directly until a dedicated action covers that lookup.
 *
 * Requires a **User token**.
 */
interface Input {
  cardId: string;
  title: string;
  content: string;
  collectionId?: string;
  folderIds?: string[] | string;
  shareStatus?: string;
}

const cardUpdate: ActionDefinition<Input> = {
  key: "card-update",
  type: "perform",
  resource: "card",
  title: "Update Card",
  description:
    "Replace a Card's title, content, share status and Folder placement. Does not touch tags.",
  idempotent: true,
  params: [
    cardIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "content", label: "Content", type: "text", required: true, hint: "HTML or Markdown." },
    { key: "collectionId", label: "Collection ID", type: "string" },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "string",
      hint: "Comma-separated Folder IDs. Replaces the Card's current Folder placement.",
    },
    shareStatusParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated Card" }],

  async execute(input, ctx) {
    const body = compact({
      preferredPhrase: input.title,
      content: input.content,
      collection: input.collectionId ? { id: input.collectionId } : undefined,
      folderIds: toList(input.folderIds),
      shareStatus: input.shareStatus,
    });
    const card = await new GuruClient(ctx).json<Record<string, unknown>>(
      `/cards/${encodeURIComponent(input.cardId)}/extended`,
      { method: "PUT", body },
    );
    return stripTokens(card);
  },
};

export default cardUpdate;
