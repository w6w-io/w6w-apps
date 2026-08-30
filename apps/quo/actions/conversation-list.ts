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
 * `GET /v1/conversations` — paginated shared-inbox conversations, newest activity first.
 * Defaults to every conversation in the workspace when no filters are given.
 */
interface Input {
  phoneNumber?: string;
  phoneNumbers?: string[];
  userId?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  excludeInactive?: boolean;
  maxResults?: number;
  pageToken?: string;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description: "Retrieve a paginated list of shared-inbox conversations, newest activity " +
    "first. Can be filtered by user and/or phone number(s); defaults to every conversation " +
    "in the workspace.",
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      placeholder: "PN123abc",
      hint: "Restrict to one Quo phone number (ID or E.164 number).",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "array",
      advanced: true,
      item: { type: "string" },
      hint: "Restrict to several Quo phone numbers (ID or E.164 number each).",
    },
    userIdParam,
    createdAfterParam,
    createdBeforeParam,
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "datetime",
      advanced: true,
      hint: "Only include conversations last updated after this date and time (ISO 8601).",
    },
    {
      key: "updatedBefore",
      label: "Updated before",
      type: "datetime",
      advanced: true,
      hint: "Only include conversations last updated before this date and time (ISO 8601).",
    },
    {
      key: "excludeInactive",
      label: "Exclude inactive",
      type: "boolean",
      advanced: true,
      hint: "Omit conversations with no recent activity.",
    },
    maxResultsParam(),
    pageTokenParam,
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Conversations (id, name, phoneNumberId, participants, assignedTo, " +
        "lastActivityAt, lastActivityId, mutedUntil, snoozedUntil, createdAt, updatedAt, " +
        "deletedAt)",
    },
    ...paginationOutputFields,
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/conversations", {
      query: {
        phoneNumber: input.phoneNumber,
        phoneNumbers: input.phoneNumbers,
        userId: input.userId,
        createdAfter: input.createdAfter,
        createdBefore: input.createdBefore,
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
        excludeInactive: input.excludeInactive,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default conversationList;
