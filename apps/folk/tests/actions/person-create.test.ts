import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-create.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("person-create: POSTs to the group's person endpoint with the built body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "p1", networkId: "n1", groupId: "g1" },
  }]);
  const out = await action.execute({
    groupId: "g1",
    fullName: "Ada Lovelace",
    emails: ["ada@example.com"],
  }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/person`,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { fullName: "Ada Lovelace", emails: ["ada@example.com"] },
  );
  assertEquals(out, { person: { id: "p1", networkId: "n1", groupId: "g1" } });
});

Deno.test("person-create: URL-encodes the group id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ groupId: "g/1" }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g%2F1/person`,
  );
});
