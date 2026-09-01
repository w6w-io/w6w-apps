import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

Deno.test("client-create: POSTs /users/clients with the client envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{
    body: { response: { result: { client: { id: 1 } } } },
  }]);
  await action.execute({ fname: "Ada", lname: "Lovelace", email: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.freshbooks.com/accounting/account/acc1/users/clients");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    client: { fname: "Ada", lname: "Lovelace", email: "ada@example.com" },
  });
});

Deno.test("client-create: drops blank fields and merges additionalFields", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: {} }]);
  await action.execute({
    fname: "Ada",
    lname: "",
    additionalFields: { vat_number: "GB123" },
  }, ctx);
  const body = JSON.parse(calls[0].body!).client;
  assertEquals(body.fname, "Ada");
  assertEquals("lname" in body, false);
  assertEquals(body.vat_number, "GB123");
});
