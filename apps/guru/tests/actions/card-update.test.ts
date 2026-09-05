import { assertEquals } from "@std/assert";
import cardUpdate from "../../actions/card-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-update: PUTs the extended card and strips the response token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "c1", preferredPhrase: "New title", collection: { id: "co1", token: "t" } } },
  ]);
  const result = await cardUpdate.execute(
    { cardId: "c1", title: "New title", content: "updated body", shareStatus: "TEAM" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/cards/c1/extended");
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    JSON.parse(calls[0].body!),
    { preferredPhrase: "New title", content: "updated body", shareStatus: "TEAM" },
  );
  assertEquals(result, { id: "c1", preferredPhrase: "New title", collection: { id: "co1" } });
});

Deno.test("card-update: never sends a tags field — see the action's own doc comment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await cardUpdate.execute({ cardId: "c1", title: "T", content: "c" }, ctx);
  assertEquals("tags" in JSON.parse(calls[0].body!), false);
});
