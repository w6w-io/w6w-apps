import { assertEquals } from "@std/assert";
import memberList from "../../actions/member-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-list: GETs /members with access_level and query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "mber_1" }]) }]);
  await memberList.execute({ accessLevel: "customer", query: "ada" }, ctx);

  assertEquals(pathOf(calls[0].url), "/members");
  assertEquals(queryOf(calls[0].url).access_level, "customer");
  assertEquals(queryOf(calls[0].url).query, "ada");
});

Deno.test("member-list: omitting accountId sends none — the vendor defaults it server-side", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await memberList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).account_id, undefined);
});
