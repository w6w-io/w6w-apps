import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GETs /me", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
  }]);
  const out = await accountGet.execute({}, ctx) as { id: number; email: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/me");
  assertEquals(out.id, 1);
  assertEquals(out.email, "ada@example.com");
});
