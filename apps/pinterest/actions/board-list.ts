import type { ActionDefinition } from "@w6w/types";
import { PinterestClient, type PinterestListPage } from "../lib/client.ts";
import { adAccountIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v5/boards` — the boards owned by the connected account, plus group
 * boards it collaborates on. `privacy` here is `BoardPrivacyFilter` (`ALL`,
 * `PUBLIC`, `PROTECTED`, `SECRET`, `PUBLIC_AND_SECRET`) — a distinct,
 * five-value enum from the three-value `BoardPrivacy` used to *create* one, so
 * it gets its own inline options rather than reusing `boardPrivacyOptions`.
 */
interface Input {
  privacy?: string;
  adAccountId?: string;
  pageSize?: number;
  bookmark?: string;
}

const boardList: ActionDefinition<Input> = {
  key: "board-list",
  type: "search",
  resource: "board",
  title: "List Boards",
  description: "List the connected account's boards, including group boards it collaborates on.",
  params: [
    {
      key: "privacy",
      label: "Privacy filter",
      type: "select",
      options: [
        { value: "ALL", label: "All" },
        { value: "PUBLIC", label: "Public" },
        { value: "PROTECTED", label: "Protected" },
        { value: "SECRET", label: "Secret" },
        { value: "PUBLIC_AND_SECRET", label: "Public and secret" },
      ],
      hint: "Leave empty to return every privacy level the connection can see.",
    },
    adAccountIdParam,
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Boards" },
    { key: "bookmark", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json<PinterestListPage<unknown>>(`/boards`, {
      query: {
        privacy: input.privacy,
        ad_account_id: input.adAccountId,
        ...paginationQuery(input),
      },
    });
  },
};

export default boardList;
