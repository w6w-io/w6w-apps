import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `PUT /api/v1/cards/{cardId}/content` — update only a Card's body.
 *
 * The wire schema Guru documents for this endpoint is the full `Card` model,
 * which marks both `content` and `preferredPhrase` (title) required — the
 * same requirement `POST /cards/extended` states in its own summary. This
 * app has no live credential to confirm the server accepts a body missing
 * `preferredPhrase` on this narrower endpoint, so both are sent rather than
 * risking a 400 on a call whose entire point is "just update the text." Use
 * Update Card instead when the title, share status or Folders also need to
 * change in the same call.
 *
 * Requires a **User token**.
 */
interface Input {
  cardId: string;
  title: string;
  content: string;
}

const cardUpdateContent: ActionDefinition<Input> = {
  key: "card-update-content",
  type: "perform",
  resource: "card",
  title: "Update Card Content",
  description:
    "Update a Card's body. Guru's own schema requires the title alongside the content on this " +
    "call — see the action's own notes.",
  idempotent: true,
  params: [
    cardIdParam,
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Sent unchanged if the title is not actually changing.",
    },
    { key: "content", label: "Content", type: "text", required: true, hint: "HTML or Markdown." },
  ],
  output: [{ key: "data", type: "object", label: "The updated Card" }],

  async execute(input, ctx) {
    const card = await new GuruClient(ctx).json<Record<string, unknown>>(
      `/cards/${encodeURIComponent(input.cardId)}/content`,
      { method: "PUT", body: { preferredPhrase: input.title, content: input.content } },
    );
    return stripTokens(card);
  },
};

export default cardUpdateContent;
