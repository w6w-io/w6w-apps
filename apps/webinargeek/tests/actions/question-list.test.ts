import { assertEquals } from "@std/assert";
import questionList from "../../actions/question-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("question-list: hits GET /questions with scope filters", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        total_count: 1,
        questions: [{ id: 1, question: "First question" }],
        pages: { next: null, page: 1, per_page: 50, total_pages: 1 },
      },
    },
  ]);
  const out = await questionList.execute({ episodeId: 3 }, ctx) as { questions: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v2/questions");
  assertEquals(queryOf(calls[0].url).episode_id, "3");
  assertEquals(out.questions, [{ id: 1, question: "First question" }]);
});
