import { assertEquals } from "@std/assert";
import candidateUpdate from "../../actions/candidate-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-update: PATCHes the id, sends `parse` as a query flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { candidate: { id: 7 }, references: [] } }]);
  await candidateUpdate.execute(
    { candidateId: 7, name: "Jane Doe", reveal: true, parse: true },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/c/123/candidates/7");
  assertEquals(queryOf(calls[0].url), { parse: "true" });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.candidate.name, "Jane Doe");
  assertEquals(body.reveal, true);
});

Deno.test("candidate-update: omitted fields are dropped, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { candidate: {} } }]);
  await candidateUpdate.execute({ candidateId: 7, name: "Jane Doe" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body.candidate), ["name"]);
  assertEquals("reveal" in body, false);
});
