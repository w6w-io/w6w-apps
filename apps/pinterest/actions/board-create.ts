import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, boardPrivacyOptions } from "../lib/params.ts";

/**
 * `POST /v5/boards` — create a board owned by the connected account (or, with
 * Business Access, the account owning `ad_account_id`).
 *
 * `BoardCreate`'s only required field is `name`. `is_ads_only` is left out:
 * Pinterest's own schema note says setting it forces `name` to the literal
 * "Ad-only Pins" and `privacy` to `PROTECTED`, which is a narrow advertising
 * feature rather than a general-purpose board, and out of place next to the
 * two schema fields this action actually exposes.
 */
interface Input {
  name: string;
  description?: string;
  privacy?: string;
  adAccountId?: string;
}

const boardCreate: ActionDefinition<Input> = {
  key: "board-create",
  type: "perform",
  resource: "board",
  title: "Create Board",
  description: "Create a board owned by the connected Pinterest account.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Summer recipes" },
    {
      key: "description",
      label: "Description",
      type: "text",
      placeholder: "My favorite summer recipes",
    },
    {
      key: "privacy",
      label: "Privacy",
      type: "select",
      options: boardPrivacyOptions,
      default: "PUBLIC",
    },
    adAccountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "privacy", type: "string", label: "Privacy" },
    { key: "pin_count", type: "number", label: "Pin count" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/boards`, {
      method: "POST",
      query: { ad_account_id: input.adAccountId },
      body: {
        name: input.name,
        description: input.description,
        privacy: input.privacy,
      },
    });
  },
};

export default boardCreate;
