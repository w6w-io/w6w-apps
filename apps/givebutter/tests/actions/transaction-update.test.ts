import { assertEquals } from "@std/assert";
import transactionUpdate from "../../actions/transaction-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-update: PUTs to /transactions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "tx_1" }) }]);
  await transactionUpdate.execute({ id: "tx_1", internal_note: "verified" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/transactions/tx_1");
  assertEquals(JSON.parse(calls[0].body!), { internal_note: "verified" });
});

Deno.test("transaction-update: a dedication is only sent when dedication_type is set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "tx_1" }) }]);
  await transactionUpdate.execute(
    {
      id: "tx_1",
      dedication_type: "in_memory_of",
      dedication_name: "Grandma",
      dedication_recipient_name: "Family",
      dedication_recipient_email: "family@example.com",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dedication, {
    type: "in_memory_of",
    name: "Grandma",
    recipient_name: "Family",
    recipient_email: "family@example.com",
  });
});

Deno.test("transaction-update: with no dedication_type, no dedication key is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "tx_1" }) }]);
  await transactionUpdate.execute({ id: "tx_1", method: "check" }, ctx);
  assertEquals("dedication" in JSON.parse(calls[0].body!), false);
});
