import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, questionIdParam } from "../lib/params.ts";

/** `DELETE /questions/{question_id}` — remove a step from its form. */
interface Input {
  questionId: string;
  organizationId?: string;
}

const questionDelete: ActionDefinition<Input> = {
  key: "question-delete",
  type: "perform",
  resource: "question",
  title: "Delete Question",
  description: "Delete a question (form step).",
  idempotent: true,
  params: [questionIdParam, organizationIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new VideoAskClient(ctx).status(
      `/questions/${encodeId(input.questionId)}`,
      { method: "DELETE", organizationId: input.organizationId },
    );
    return { status };
  },
};

export default questionDelete;
