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
 * `GET /v1/calls` — paginated calls between a Quo number and one other number.
 *
 * Unlike `message-list`, `participants` here is capped at exactly **one** — Quo's own
 * description: "Currently limited to one-to-one (1:1) conversations only." Passing more than
 * one participant is rejected by the API even though the query grammar (`participants` repeated,
 * no brackets) is identical to the messages endpoint.
 */
interface Input {
  phoneNumberId: string;
  participant: string;
  userId?: string;
  createdAfter?: string;
  createdBefore?: string;
  maxResults?: number;
  pageToken?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description: "Retrieve a paginated list of calls between a Quo number and one other number " +
    "(1:1 only — unlike List Messages, this endpoint does not support group participants).",
  params: [
    {
      key: "phoneNumberId",
      label: "Phone number ID",
      type: "string",
      required: true,
      placeholder: "PN123abc",
      hint: "The Quo number whose calls to list.",
    },
    {
      key: "participant",
      label: "Participant",
      type: "string",
      required: true,
      placeholder: "+15555555555",
      hint: "The other party's phone number in E.164 format. Exactly one — Quo's List Calls " +
        "endpoint supports only 1:1 conversations.",
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
      label: "Calls (id, direction, status, duration, answeredAt, answeredBy, initiatedBy, " +
        "completedAt, createdAt, callRoute, forwardedFrom, forwardedTo, aiHandled, " +
        "phoneNumberId, participants, userId)",
    },
    ...paginationOutputFields,
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/calls", {
      query: {
        phoneNumberId: input.phoneNumberId,
        participants: [input.participant],
        userId: input.userId,
        createdAfter: input.createdAfter,
        createdBefore: input.createdBefore,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default callList;
