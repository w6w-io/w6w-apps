import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/lead-upsert.ts";

Deno.test("lead-upsert: PUTs /leads (dedupe by email), not /leads/{id}", async () => {
  const body = envelope({ id: 3, email: "alexis@reddit.com" });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ email: "alexis@reddit.com", company: "Reddit" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads");
  assertEquals(calls[0].method, "PUT");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email, "alexis@reddit.com");
  assertEquals(sent.company, "Reddit");
  assertEquals(result, body);
});

Deno.test("lead-upsert: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
