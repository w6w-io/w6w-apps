import { assertEquals, assertRejects } from "@std/assert";
import clientList from "../../actions/client-list.ts";
import { errorBody, mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("client-list: calls GET /v1/Clients", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "c1" }]) }]);
  const out = await clientList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/Clients");
  assertEquals(out.items, [{ id: "c1" }]);
});

Deno.test("client-list: a plan-restricted 402 surfaces the vendor's own code", async () => {
  const { ctx } = mockCtx([
    { status: 402, body: errorBody("feature_restricted_subscription", "not allowed on this plan") },
  ]);
  await assertRejects(
    () => Promise.resolve(clientList.execute({}, ctx)),
    Error,
    "feature_restricted_subscription",
  );
});
