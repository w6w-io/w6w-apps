import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-replace-text.ts";

Deno.test("document-replace-text: emits replaceAllText with matchCase=false default", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute!(
    { documentURL: "d-1", text: "foo", replaceText: "bar" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      replaceAllText: {
        replaceText: "bar",
        containsText: { text: "foo", matchCase: false },
      },
    }],
  });
});

Deno.test("document-replace-text: matchCase=true is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", text: "F", replaceText: "b", matchCase: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.requests[0].replaceAllText.containsText.matchCase, true);
});
