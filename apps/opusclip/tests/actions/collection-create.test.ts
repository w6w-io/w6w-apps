import { assertEquals } from "@std/assert";
import collectionCreate from "../../actions/collection-create.ts";
import { assertRejectsMessage, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-create: POSTs collectionName and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: envelope({ collectionId: "col1", collectionName: "Demo" }) },
  ]);
  const out = await collectionCreate.execute({ collectionName: "Demo" }, ctx) as {
    collectionId: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/collections");
  assertEquals(JSON.parse(calls[0].body!), { collectionName: "Demo" });
  assertEquals(out.collectionId, "col1");
});

Deno.test("collection-create: a 402 QuotaExceed surfaces the vendor's errorName", async () => {
  const { ctx } = mockCtx([
    { status: 402, body: { errorName: "QuotaExceed", errorMessage: "plan limit reached" } },
  ]);
  await assertRejectsMessage(
    () => collectionCreate.execute({ collectionName: "Demo" }, ctx),
    "QuotaExceed",
  );
});

Deno.test("collection-create: is declared non-idempotent", () => {
  assertEquals(collectionCreate.idempotent, false);
});
