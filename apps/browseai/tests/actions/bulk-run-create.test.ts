import { assertEquals, assertRejects } from "@std/assert";
import bulkRunCreate from "../../actions/bulk-run-create.ts";
import { mockCtx, pathOf, resultEnvelope } from "../_helpers.ts";

const BULK_RUN = { id: "b1", status: "in-progress", tasksCount: 2, createdAt: 1 };

Deno.test("bulk-run-create: POSTs an array of input-parameter sets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope({ bulkRun: BULK_RUN }) }]);
  const inputParameters = [{ originUrl: "https://a.example" }, { originUrl: "https://b.example" }];
  const out = await bulkRunCreate.execute(
    { robotId: "r1", title: "My bulk run", inputParameters },
    ctx,
  ) as typeof BULK_RUN;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/bulk-runs");
  assertEquals(JSON.parse(calls[0].body!), { title: "My bulk run", inputParameters });
  assertEquals(out.tasksCount, 2);
});

Deno.test("bulk-run-create: missing inputParameters fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await bulkRunCreate.execute({ robotId: "r1", inputParameters: undefined }, ctx),
    Error,
    "Input parameters is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bulk-run-create: is declared non-idempotent — each call starts new tasks", () => {
  assertEquals(bulkRunCreate.idempotent, false);
});
