import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-paragraph-bullets.ts";

Deno.test("document-delete-paragraph-bullets: emits deleteParagraphBullets with range", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", startIndex: 5, endIndex: 15 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      deleteParagraphBullets: {
        range: { segmentId: "", startIndex: 5, endIndex: 15 },
      },
    }],
  });
});
