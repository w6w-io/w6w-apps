import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-visitor.ts";

Deno.test("get-visitor: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "v1" } }]);
  const result = await action.execute!({ visitorId: "v1" }, ctx) as { visitor: unknown };
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/visitor/v1");
  assertEquals(result.visitor, { id: "v1" });
});

Deno.test("get-visitor: encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a/b" } }]);
  await action.execute!({ visitorId: "a/b" }, ctx);
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/visitor/a%2Fb");
});

Deno.test("get-visitor: `visitorId` is required", async () => {
  await assertRejects(
    async () => await action.execute!({}, mockCtx([]).ctx),
    Error,
    "`visitorId` is required",
  );
});

Deno.test("get-visitor: a 404 throws with Pendo's guidance", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  await assertRejects(
    async () => await action.execute!({ visitorId: "missing" }, ctx),
    Error,
    "404",
  );
});
