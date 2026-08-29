import { assertEquals } from "@std/assert";
import entryCreate from "../../actions/entry-create.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("entry-create: posts to /v1/entries/create, normalising array params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1" } }]);
  const out = await entryCreate.execute(
    {
      title: "New dark mode",
      details: "You can now switch to dark mode.",
      type: "new",
      published: true,
      postIDs: "p1, p2",
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/entries/create");
  assertEquals(bodyOf(calls[0]), {
    title: "New dark mode",
    details: "You can now switch to dark mode.",
    type: "new",
    published: true,
    postIDs: ["p1", "p2"],
  });
  assertEquals(out.id, "e1");
});

Deno.test("entry-create: is not idempotent", () => {
  assertEquals(entryCreate.idempotent, false);
});
