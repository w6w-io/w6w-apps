import { assertEquals } from "@std/assert";
import action from "../../actions/administration-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("administration-list: GETs /administrations.json with no admin id in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "123", name: "Acme" }] }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(calls[0].url, "https://moneybird.com/api/v2/administrations.json");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.items, [{ id: "123", name: "Acme" }]);
});

Deno.test("administration-list: an empty result stays an empty array", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
