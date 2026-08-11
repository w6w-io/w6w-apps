import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { id: "5", name: "VIP" };

Deno.test("tag-create: POSTs the tag", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await tagCreate.execute({ name: "VIP", description: "High value" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tags");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP", description: "High value" });
});

/**
 * `CategoryReference` requires `id`, so the category travels nested. A flat
 * `category_id` is silently ignored and the tag lands uncategorised.
 */
Deno.test("tag-create: the category is a nested reference, not a flat id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await tagCreate.execute({ name: "VIP", categoryId: "3" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.category, { id: "3" });
  assertEquals(body.category_id, undefined);
});

Deno.test("tag-create: no category key at all when none was chosen", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await tagCreate.execute({ name: "VIP" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP" });
});

Deno.test("tag-create: is declared non-idempotent — Keap creates a duplicate rather than matching by name", () => {
  assertEquals(tagCreate.idempotent, false);
});
