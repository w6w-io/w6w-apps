import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/survey-update.ts";

Deno.test("survey-update: PUTs /satisfaction-surveys/{id} with the score and comment", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1234, score: 5 } }]);
  await action.execute({ surveyId: 1234, score: 5, bodyText: "Great!" }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/satisfaction-surveys/1234");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.score, 5);
  assertEquals(body.body_text, "Great!");
});
