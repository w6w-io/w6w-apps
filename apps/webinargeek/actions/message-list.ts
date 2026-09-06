import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient, type WebinarGeekPages } from "../lib/client.ts";
import { messageTypeOptions, paginationParams, scopeFilterParams } from "../lib/params.ts";

/**
 * `GET /messages` — chat messages and questions sent by viewers, moderators or presenters,
 * account-wide or filtered to a broadcast, episode or webinar.
 *
 * `recipient_id` is the subscription ID of a private message's recipient — private chat is
 * per-subscriber, so grouping by it reconstructs one conversation.
 */
interface Input {
  webinarId?: number;
  episodeId?: number;
  broadcastId?: number;
  type?: string;
  order?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List chat messages, private messages, or Q&A-box questions from broadcasts.",
  params: [
    ...scopeFilterParams(),
    { key: "type", label: "Message type", type: "select", options: messageTypeOptions },
    {
      key: "order",
      label: "Order by",
      type: "select",
      default: "created_at",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "recipient_id", label: "Recipient (groups by conversation)" },
      ],
    },
    {
      key: "sort",
      label: "Sort direction",
      type: "select",
      default: "desc",
      options: [{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }],
    },
    ...paginationParams(),
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
    { key: "totalCount", type: "number", label: "Total matching messages" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Results per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarGeekClient(ctx).request<
      { total_count?: number; messages?: unknown[]; pages?: WebinarGeekPages }
    >("/messages", {
      query: {
        webinar_id: input.webinarId,
        episode_id: input.episodeId,
        broadcast_id: input.broadcastId,
        type: input.type,
        order: input.order,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return {
      messages: body?.messages ?? [],
      totalCount: body?.total_count ?? 0,
      page: body?.pages?.page,
      perPage: body?.pages?.per_page,
      totalPages: body?.pages?.total_pages,
    };
  },
};

export default messageList;
