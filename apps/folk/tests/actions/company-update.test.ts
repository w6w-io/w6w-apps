import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-update.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("company-update: PUTs to the company's endpoint with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const out = await action.execute({ groupId: "g1", companyId: "c1", name: "Acme Inc" }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/company/c1`,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme Inc" });
  assertEquals(out, { company: { id: "c1" } });
});
