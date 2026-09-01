import { assertEquals } from "@std/assert";
import containerGet from "../../actions/container-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("container-get: calls GET /containers/fetch with the id", async () => {
  const container = {
    id: "c1",
    status: "finished",
    createdAt: 1,
    launchType: "manual",
    retryNumber: 0,
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: container }]);

  const out = await containerGet.execute({ id: "c1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/containers/fetch");
  assertEquals(queryOf(calls[0].url).id, "c1");
  assertEquals(out.container, container);
});

Deno.test("container-get: forwards the with* flags only when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);

  await containerGet.execute({
    id: "c1",
    withResultObject: true,
    withOutput: true,
    withRuntimeEvents: false,
    withNewerAndOlderContainerId: true,
  }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(query.withResultObject, "true");
  assertEquals(query.withOutput, "true");
  assertEquals("withRuntimeEvents" in query, false);
  assertEquals(query.withNewerAndOlderContainerId, "true");
});
