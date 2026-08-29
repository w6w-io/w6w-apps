import type { ActionDefinition } from "@w6w/types";
import { compact, PinterestClient } from "../lib/client.ts";
import { pinIdParam } from "../lib/params.ts";

/**
 * `POST /v5/pins/{pin_id}/save` — save an existing Pin (yours or someone
 * else's) onto one of the connected account's boards or board sections. This
 * is Pinterest's own distinction from `pin-create`: creating publishes new
 * content, saving re-pins content that already exists.
 *
 * Both body fields are optional and nullable in `PinsSaveRequestCreate` —
 * Pinterest's own description says the Pin is saved to a default location
 * when neither is given.
 *
 * `ad_account_id` is not offered here: unlike every other Pin/board endpoint,
 * Pinterest's OpenAPI description lists no `query_ad_account_id` parameter on
 * this operation.
 */
interface Input {
  pinId: string;
  boardId?: string;
  boardSectionId?: string;
}

const pinSave: ActionDefinition<Input> = {
  key: "pin-save",
  type: "perform",
  resource: "pin",
  title: "Save Pin",
  description: "Save an existing Pin onto one of your boards.",
  idempotent: false,
  params: [
    pinIdParam,
    {
      key: "boardId",
      label: "Board",
      type: "string",
      hint: "Board to save onto. Leave empty to use Pinterest's default location.",
    },
    { key: "boardSectionId", label: "Board section", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Pin ID" },
    { key: "board_id", type: "string", label: "Board ID" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/pins/${encodeURIComponent(input.pinId)}/save`, {
      method: "POST",
      body: compact({ board_id: input.boardId, board_section_id: input.boardSectionId }),
    });
  },
};

export default pinSave;
