import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import {
  createdAfterParam,
  createdBeforeParam,
  maxResultsParam,
  pageTokenParam,
  paginationOutputFields,
  userIdParam,
} from "../lib/params.ts";

/**
 * `GET /v1/messages` — chronological messages between a Quo number and up to 10 participants.
 *
 * A single participant returns that 1:1 conversation's messages; multiple participants return a
 * group conversation's messages (up to 10, repeating the `participants` query key). This is
 * wider than `call-list`, whose own `participants` filter is capped at exactly one — Quo groups
 * texts but not calls.
 */
interface Input {
  phoneNumberId: string;
  participants: string[];
  userId?: string;
  createdAfter?: string;
  createdBefore?: string;
  maxResults?: number;
  pageToken?: string;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "Retrieve a chronological, paginated list of messages between a Quo number and " +
    "up to 10 participants.",
  params: [
    {
      key: "phoneNumberId",
      label: "Phone number ID",
      type: "string",
      required: true,
      placeholder: "PN123abc",
      hint: "The Quo number whose messages to list.",
    },
    {
      key: "participants",
      label: "Participants",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "+15555555555" },
      hint: "1-10 phone numbers (E.164), excluding the Quo number. Multiple participants " +
        "retrieve a group conversation's messages.",
    },
    userIdParam,
    createdAfterParam,
    createdBeforeParam,
    maxResultsParam(),
    pageTokenParam,
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Messages (id, to, from, text, phoneNumberId, conversationId, direction, userId, " +
        "status, createdAt, updatedAt, media)",
    },
    ...paginationOutputFields,
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/messages", {
      query: {
        phoneNumberId: input.phoneNumberId,
        participants: input.participants,
        userId: input.userId,
        createdAfter: input.createdAfter,
        createdBefore: input.createdBefore,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default messageList;
