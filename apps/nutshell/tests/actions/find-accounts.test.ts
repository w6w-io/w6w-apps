import { assertEquals } from "@std/assert";
import findAccounts from "../../actions/find-accounts.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("find-accounts: is a search action", () => {
  assertEquals(findAccounts.type, "search");
});

Deno.test("find-accounts: builds query from hasOpenLeads and tag", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 1 }] }]);
  const result = await findAccounts.execute({ hasOpenLeads: true, tag: "vip, gold" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "findAccounts");
  assertEquals(rpcBody(calls[0]).params.query, { hasOpenLeads: true, tag: ["vip", "gold"] });
  assertEquals(result.count, 1);
});

Deno.test("find-accounts: an empty call still queries everything", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await findAccounts.execute({}, ctx);
  assertEquals(rpcBody(calls[0]).params.query, {});
});
