import { assertEquals, assertRejects } from "@std/assert";
import leadUpsert from "../../actions/lead-upsert.ts";
import { dataEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("lead-upsert: posts to /v2/leads/upsert with the filter in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await leadUpsert.execute({ filterEmail: "mark@example.com", status: "New" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/leads/upsert");
  assertEquals(queryOf(calls[0].url), { email: "mark@example.com" });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.status, "New");
});

Deno.test("lead-upsert: refuses to run with no filter", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await leadUpsert.execute({ status: "New" }, ctx),
    Error,
    "at least one filter",
  );
  assertEquals(calls.length, 0);
});
