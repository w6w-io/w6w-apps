import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, questionIdParam } from "../lib/params.ts";

/**
 * `POST /questions/{question_id}/duplicate` — copy a question into the same
 * form. Per the vendor's own note: "The duplicated question will be added to
 * the form but you will need to set up logic actions to connect [it] to the
 * flow" — the copy is unreachable from the form's start until you wire a
 * `logic_actions` jump to it (Update Question).
 */
interface Input {
  questionId: string;
  organizationId?: string;
}

const questionDuplicate: ActionDefinition<Input> = {
  key: "question-duplicate",
  type: "perform",
  resource: "question",
  title: "Duplicate Question",
  description:
    "Duplicate a question within its form. The copy is not wired into the flow — connect it " +
    "with a logic action via Update Question.",
  idempotent: false,
  params: [questionIdParam, organizationIdParam],
  output: [{ key: "result", type: "object", label: "The new (duplicated) question" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/questions/${encodeId(input.questionId)}/duplicate`,
      { method: "POST", organizationId: input.organizationId },
    );
    return { result };
  },
};

export default questionDuplicate;
