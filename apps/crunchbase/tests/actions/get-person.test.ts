import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-person.ts";

Deno.test("get-person: GETs the person entity path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: { name: "Ada" } } }]);
  await action.execute!({ entityId: "ada-lovelace" }, ctx);
  assertEquals(calls[0].url, "https://api.crunchbase.com/v4/data/entities/people/ada-lovelace");
});

Deno.test("get-person: entityId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ entityId: "" }, ctx),
    Error,
    "`entityId`",
  );
  assertEquals(calls.length, 0);
});
