import { assertEquals } from "@std/assert";
import callAnalyze from "../../actions/call-analyze.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-analyze: posts goal + questions and maps the answers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: "success",
      message: "Successfully analyzed call",
      answers: ["human", "Positive", true],
    },
  }]);
  const questions = [
    ["Who answered the call?", "human or voicemail"],
    ["Positive feedback:", "string"],
    ["Customer satisfied", "boolean"],
  ];
  const out = await callAnalyze.execute(
    { callId: "c-1", goal: "Check satisfaction", questions },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v1/calls/c-1/analyze");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.goal, "Check satisfaction");
  assertEquals(body.questions, questions);
  assertEquals(out.answers, ["human", "Positive", true]);
});

Deno.test("call-analyze: accepts questions as a JSON string form-field value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success", answers: [] } }]);
  await callAnalyze.execute({
    callId: "c-1",
    goal: "g",
    questions: '[["q","string"]]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.questions, [["q", "string"]]);
});

Deno.test("call-analyze: is declared not idempotent", () => {
  assertEquals(callAnalyze.idempotent, false);
});
