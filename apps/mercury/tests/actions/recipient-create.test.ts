import { assertEquals, assertRejects } from "@std/assert";
import recipientCreate from "../../actions/recipient-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-create: POSTs /recipients with name and emails", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec_new" } }]);
  await recipientCreate.execute({ name: "Acme Corp", emails: ["billing@acme.test"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/recipients");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Acme Corp");
  assertEquals(body.emails, ["billing@acme.test"]);
});

Deno.test("recipient-create: parses electronicRoutingInfo from a JSON string param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await recipientCreate.execute(
    {
      name: "Acme Corp",
      emails: ["billing@acme.test"],
      electronicRoutingInfo: JSON.stringify({
        accountNumber: "123",
        routingNumber: "456",
        electronicAccountType: "businessChecking",
        address: {
          address1: "1 Main St",
          city: "NYC",
          region: "NY",
          postalCode: "10001",
          country: "US",
        },
      }),
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.electronicRoutingInfo.accountNumber, "123");
  assertEquals(body.electronicRoutingInfo.electronicAccountType, "businessChecking");
});

Deno.test("recipient-create: an unparseable routing-info JSON string throws before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await recipientCreate.execute(
        { name: "Acme Corp", emails: ["a@b.test"], checkInfo: "{not json" },
        ctx,
      ),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});
