import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-named-range.ts";

Deno.test("document-delete-named-range: by ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", reference: "namedRangeId", value: "nr-1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{ deleteNamedRange: { namedRangeId: "nr-1" } }],
  });
});

Deno.test("document-delete-named-range: by name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", reference: "name", value: "chapter-1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{ deleteNamedRange: { name: "chapter-1" } }],
  });
});
