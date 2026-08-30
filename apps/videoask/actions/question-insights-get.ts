import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, questionIdParam } from "../lib/params.ts";

/**
 * `GET /questions/{question_id}/insights` — aggregate stats for one question.
 *
 * Shape varies by question type: a poll question answers
 * `{answers_count, poll_options: [{id, content, total_count}]}`; a plain
 * question answers just `{answers_count}` — both confirmed against the
 * vendor's captured examples, which is why `poll_options` is not declared in
 * `output` as always present.
 */
interface Input {
  questionId: string;
  organizationId?: string;
}

const questionInsightsGet: ActionDefinition<Input> = {
  key: "question-insights-get",
  type: "read",
  resource: "question",
  title: "Get Question Insights",
  description: "Read a question's aggregate stats (answer count, and poll option tallies if any).",
  params: [questionIdParam, organizationIdParam],
  output: [
    { key: "answers_count", type: "number", label: "Total answers" },
    { key: "poll_options", type: "array", label: "Poll option tallies (poll questions only)" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).entity(`/questions/${encodeId(input.questionId)}/insights`, {
      organizationId: input.organizationId,
    });
  },
};

export default questionInsightsGet;
