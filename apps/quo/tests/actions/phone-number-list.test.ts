import { assertEquals } from "@std/assert";
import phoneNumberList from "../../actions/phone-number-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("phone-number-list: GETs /v1/phone-numbers with an optional userId filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "PN1" }] } }]);
  const out = await phoneNumberList.execute({ userId: "US1" }, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/phone-numbers");
  assertEquals(queryOf(calls[0].url).userId, "US1");
  assertEquals(out.data.length, 1);
});

Deno.test("phone-number-list: omits userId entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await phoneNumberList.execute({}, ctx);
  assertEquals("userId" in queryOf(calls[0].url), false);
});

Deno.test("phone-number-list: is a search action", () => {
  assertEquals(phoneNumberList.type, "search");
});
