import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/email-enrichment.ts";

Deno.test("email-enrichment: GETs /people/find (not /email-enrichment)", async () => {
  const body = envelope({ email: "matt@hunter.io", name: { fullName: "Matthew Tharp" } });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "matt@hunter.io" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/people/find");
  assertEquals(queryOf(calls[0].url).email, "matt@hunter.io");
  assertEquals(result, body);
});

Deno.test("email-enrichment: forwards linkedinHandle", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute!({ linkedinHandle: "matttharp" }, ctx);
  assertEquals(queryOf(calls[0].url).linkedin_handle, "matttharp");
});
