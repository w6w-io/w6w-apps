import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

Deno.test("lead-update: PUTs /leads/{id} and returns undefined data on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ id: 1, company: "Facebook" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads/1");
  assertEquals(calls[0].method, "PUT");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.company, "Facebook");
  assertEquals("id" in sent, false, "the path id must not also be sent in the body");
  assertEquals(result, { data: undefined });
});

Deno.test("lead-update: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
