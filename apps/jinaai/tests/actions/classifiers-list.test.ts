import { assertEquals } from "@std/assert";
import classifiersList from "../../actions/classifiers-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("classifiers-list: calls POST /v1/classifiers, per the spec's operationId", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ classifier_id: "clf-1" }] }]);
  const out = await classifiersList.execute({}, ctx) as { classifiers: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/classifiers");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.classifiers, [{ classifier_id: "clf-1" }]);
});
