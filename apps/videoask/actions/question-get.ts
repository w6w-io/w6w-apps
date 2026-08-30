import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, questionIdParam } from "../lib/params.ts";

/** `GET /questions/{question_id}` — one form step's full definition. */
interface Input {
  questionId: string;
  organizationId?: string;
}

const questionGet: ActionDefinition<Input> = {
  key: "question-get",
  type: "read",
  resource: "question",
  title: "Get Question",
  description: "Fetch one question (form step) by id.",
  params: [questionIdParam, organizationIdParam],
  output: [{ key: "result", type: "object", label: "The question" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/questions/${encodeId(input.questionId)}`,
      { organizationId: input.organizationId },
    );
    return { result };
  },
};

export default questionGet;
