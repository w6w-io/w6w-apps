import { assertEquals } from "@std/assert";
import getReviewer from "../../actions/get-reviewer.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-reviewer: fetches by internal id with no lookup query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { reviewer: { id: 7, email: "a@b.com" } } }]);
  const out = await getReviewer.execute({ id: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/reviewers/7");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { reviewer: { id: 7, email: "a@b.com" } });
});

Deno.test("get-reviewer: -1 sentinel with externalId/email look-up params", async () => {
  const { ctx, calls } = mockCtx([{ body: { reviewer: {} } }]);
  await getReviewer.execute({ id: -1, externalId: 555, email: "a@b.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/reviewers/-1");
  assertEquals(queryOf(calls[0].url), { external_id: "555", email: "a@b.com" });
});
