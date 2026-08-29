import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/combined-enrichment.ts";

Deno.test("combined-enrichment: GETs /combined/find (not /combined-enrichment)", async () => {
  const body = envelope({ person: { email: "matt@hunter.io" }, company: { domain: "hunter.io" } });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "matt@hunter.io" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/combined/find");
  assertEquals(queryOf(calls[0].url).email, "matt@hunter.io");
  assertEquals(result, body);
});
