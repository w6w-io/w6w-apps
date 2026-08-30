import { assertEquals } from "@std/assert";
import domainGet from "../../actions/domain-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("domain-get: calls GET /domains/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1225953", name: "forward.corporatecole.com" } }]);
  const out = await domainGet.execute({ domainId: "1225953" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/domains/1225953");
  assertEquals(out.name, "forward.corporatecole.com");
});
