import type { ActionDefinition } from "@w6w/types";
import { asJson, BlandClient } from "../lib/client.ts";

/**
 * `POST /v1/calls/{call_id}/analyze` — grade a completed call against questions.
 *
 * Verified against `docs.bland.ai/api-v1/post/calls-id-analyze`. `questions`
 * is documented as `string[][]` — each entry `[question, expectedAnswerType]`
 * — passed through here as JSON so the shape survives exactly as Bland
 * expects it.
 */
interface Input {
  callId: string;
  goal: string;
  questions: unknown;
}

const callAnalyze: ActionDefinition<Input> = {
  key: "call-analyze",
  type: "perform",
  resource: "call",
  title: "Analyze Call",
  description: "Analyze a call's transcript against a goal and a set of questions using AI.",
  // Each run spends AI-analysis credits (documented: ~0.003 base + ~0.0015/answer);
  // retrying a dropped response would bill the analysis twice.
  idempotent: false,
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
    {
      key: "goal",
      label: "Goal",
      type: "text",
      required: true,
      hint: "The overall purpose of the call.",
    },
    {
      key: "questions",
      label: "Questions",
      type: "json",
      required: true,
      hint:
        'Array of [question, expectedType] pairs, e.g. [["Who answered?", "human or voicemail"]].',
    },
  ],
  output: [
    { key: "status", type: "string", label: "success or error" },
    { key: "message", type: "string", label: "Status message" },
    { key: "answers", type: "array", label: "Answers, in question order" },
  ],

  async execute(input, ctx) {
    const questions = asJson<unknown[]>(input.questions, "questions");
    const res = await new BlandClient(ctx).request<{
      status: string;
      message?: string;
      answers?: unknown[];
    }>(`/v1/calls/${encodeURIComponent(input.callId)}/analyze`, {
      method: "POST",
      body: { goal: input.goal, questions },
    });
    return { status: res.status, message: res.message, answers: res.answers ?? [] };
  },
};

export default callAnalyze;
