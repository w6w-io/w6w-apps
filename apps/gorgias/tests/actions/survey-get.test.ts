import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/survey-get.ts";

Deno.test("survey-get: GETs /satisfaction-surveys/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1234, score: 2 } }]);
  const out = await action.execute({ surveyId: 1234 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/satisfaction-surveys/1234");
  assertEquals(out, { id: 1234, score: 2 });
});
