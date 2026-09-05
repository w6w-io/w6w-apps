import { assertEquals } from "@std/assert";
import quoteUpdate from "../../actions/quote-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quote-update: PATCHes with application/merge-patch+json, not application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "q-1", payOut: "SWIFT_OUR" } }]);
  const out = await quoteUpdate.execute(
    { profileId: 1, quoteId: "q-1", targetAccount: 55, payOut: "SWIFT_OUR" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/quotes/q-1");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
  assertEquals(JSON.parse(calls[0].body!), { targetAccount: 55, payOut: "SWIFT_OUR" });
  assertEquals(out.id, "q-1");
});

Deno.test("quote-update: omits payOut from the body when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "q-1" } }]);
  await quoteUpdate.execute({ profileId: 1, quoteId: "q-1", targetAccount: 55 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { targetAccount: 55 });
});

Deno.test("quote-update: is declared idempotent (a merge-patch is a full state assignment)", () => {
  assertEquals(quoteUpdate.idempotent, true);
});
