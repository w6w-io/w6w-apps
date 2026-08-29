import type { ActionDefinition } from "@w6w/types";
import { compact, PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, boardIdParam, pinIdParam } from "../lib/params.ts";

/**
 * `PATCH /v5/pins/{pin_id}` — update a Pin's title, description, alt text,
 * link, or move it to a different board/section.
 *
 * `PinUpdate` also carries `carousel_slots` (for multi-image "collection"
 * Pins) and `ai_disclosures` — both left out as narrow, format-specific
 * fields rather than part of this action's general-purpose surface.
 */
interface Input {
  pinId: string;
  title?: string;
  description?: string;
  altText?: string;
  link?: string;
  boardId?: string;
  boardSectionId?: string;
  adAccountId?: string;
}

const pinUpdate: ActionDefinition<Input> = {
  key: "pin-update",
  type: "perform",
  resource: "pin",
  title: "Update Pin",
  description: "Update a Pin's title, description, alt text, link, or move it to another board.",
  idempotent: true,
  params: [
    pinIdParam,
    { key: "title", label: "Title", type: "string", validation: { maxLength: 100 } },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 800 } },
    { key: "altText", label: "Alt text", type: "string", validation: { maxLength: 500 } },
    { key: "link", label: "Destination link", type: "string", validation: { maxLength: 2048 } },
    { ...boardIdParam, required: false, hint: "Move the Pin to this board." },
    {
      key: "boardSectionId",
      label: "Board section",
      type: "string",
      advanced: true,
      hint: "Move the Pin into this section of its board.",
    },
    adAccountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Pin ID" },
    { key: "board_id", type: "string", label: "Board ID" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/pins/${encodeURIComponent(input.pinId)}`, {
      method: "PATCH",
      query: { ad_account_id: input.adAccountId },
      body: compact({
        title: input.title,
        description: input.description,
        alt_text: input.altText,
        link: input.link,
        board_id: input.boardId,
        board_section_id: input.boardSectionId,
      }),
    });
  },
};

export default pinUpdate;
