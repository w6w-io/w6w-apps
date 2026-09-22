import { assertEquals } from "@std/assert";
import titleCreate from "../../actions/title-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const TITLE = { id: "tl_1", name: "Staff Engineer" };

Deno.test("title-create: POSTs a name and nothing else", async () => {
  const { ctx, calls } = mockCtx([{ body: TITLE }]);
  const result = await titleCreate.execute({ name: "Staff Engineer" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/titles");
  // Locations and departments take a description; a title has no such field.
  assertEquals(bodyOf(calls[0]), { name: "Staff Engineer" });
  assertEquals(result, TITLE);
});

Deno.test("title-create: no description param is offered, because the API has none", () => {
  assertEquals(titleCreate.params?.map((p) => p.key), ["name", "idempotencyKey"]);
});

Deno.test("title-create: a create is not declared idempotent, and forwards a key when given", async () => {
  const { ctx, calls } = mockCtx([{ body: TITLE }]);
  await titleCreate.execute({ name: "Staff Engineer", idempotencyKey: "k1" }, ctx);

  assertEquals(calls[0].headers["idempotency-key"], "k1");
  assertEquals(titleCreate.idempotent, false);
});
