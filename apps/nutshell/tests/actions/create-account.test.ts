import { assertEquals } from "@std/assert";
import createAccount from "../../actions/create-account.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("create-account: is a non-idempotent perform action", () => {
  assertEquals(createAccount.type, "perform");
  assertEquals(createAccount.idempotent, false);
});

Deno.test("create-account: splits comma-separated phone/url/tags into arrays", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 1, name: "Acme" } }]);
  await createAccount.execute({
    name: "Acme",
    phone: "717-555-0480, 877-555-9988",
    url: "https://acme.example",
    tags: "vip",
  }, ctx);

  const account = rpcBody(calls[0]).params.account as Record<string, unknown>;
  assertEquals(account.name, "Acme");
  assertEquals(account.phone, ["717-555-0480", "877-555-9988"]);
  assertEquals(account.url, ["https://acme.example"]);
  assertEquals(account.tags, ["vip"]);
});
