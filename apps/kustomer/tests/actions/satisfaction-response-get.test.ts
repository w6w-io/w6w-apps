import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/satisfaction-response-get.ts";

Deno.test("satisfaction-response-get: GETs /satisfaction-responses/{id}", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "r1" } } }]);
  const out = await action.execute({ id: "r1" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/satisfaction-responses/r1");
  assertEquals(out, { id: "r1" });
});
