import { assertEquals } from "@std/assert";
import listCreate from "../../actions/list-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-create: POSTs to /lists", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 715, href: "/api/v2/lists/715" } }]);
  const out = await listCreate.execute({ name: "Private list" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/lists");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Private list" });
  assertEquals(out, { id: 715, href: "/api/v2/lists/715" });
});
