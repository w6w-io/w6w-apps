import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";
import { postIdParam } from "../lib/params.ts";

/**
 * `POST /v1/votes/create` — cast a vote for a post on behalf of a voter.
 *
 * Idempotent: Canny's own "Returns" text is explicit — "success if the vote
 * was successfully created **or already exists**" — so a retry converges on
 * the same state rather than duplicating a vote.
 */
interface Input {
  postID: string;
  voterID: string;
  byID?: string;
  votePriority?: number;
  createdAt?: string;
}

const voteCreate: ActionDefinition<Input> = {
  key: "vote-create",
  type: "perform",
  resource: "vote",
  title: "Create Vote",
  description: "Cast a vote for a post on behalf of a voter.",
  idempotent: true,
  params: [
    postIdParam,
    {
      key: "voterID",
      label: "Voter",
      type: "string",
      required: true,
      hint: "The voter's unique identifier.",
    },
    {
      key: "byID",
      label: "Cast by (admin)",
      type: "string",
      advanced: true,
      hint: "The Canny administrator who cast this vote on the voter's behalf.",
    },
    {
      key: "votePriority",
      label: "Vote priority",
      type: "number",
      advanced: true,
      hint: "The priority to assign this vote, if your workspace uses vote prioritization.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "If this vote is being migrated from another source, its original creation time " +
        "(ISO 8601).",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/votes/create", {
      postID: input.postID,
      voterID: input.voterID,
      byID: input.byID,
      votePriority: input.votePriority,
      createdAt: input.createdAt,
    });
    return { message };
  },
};

export default voteCreate;
