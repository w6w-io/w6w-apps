import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams, questionIdParam } from "../lib/params.ts";

/**
 * `GET /questions/{question_id}/answers` — every answer given to one
 * question, across all contacts.
 *
 * Accepts `limit`/`offset` exactly like the enveloped lists, but answers a
 * **bare JSON array** — confirmed against the vendor's own captured example.
 * See `lib/client.ts`'s module doc for why this is the one endpoint using
 * {@link VideoAskClient.array} instead of {@link VideoAskClient.list}.
 */
interface Input {
  questionId: string;
  limit?: number;
  offset?: number;
  organizationId?: string;
}

const questionAnswersList: ActionDefinition<Input> = {
  key: "question-answers-list",
  type: "read",
  resource: "answer",
  title: "List Question Answers",
  description:
    "List every answer given to one question. Returns a bare array, not a page envelope.",
  params: [questionIdParam, ...paginationParams(20), organizationIdParam],
  output: [{ key: "answers", type: "array", label: "Answers" }],

  async execute(input, ctx) {
    const answers = await new VideoAskClient(ctx).array(
      `/questions/${encodeId(input.questionId)}/answers`,
      { query: { limit: input.limit, offset: input.offset }, organizationId: input.organizationId },
    );
    return { answers };
  },
};

export default questionAnswersList;
