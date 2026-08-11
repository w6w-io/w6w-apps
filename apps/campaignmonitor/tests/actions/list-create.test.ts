import { assertEquals } from "@std/assert";
import listCreate from "../../actions/list-create.ts";
import { API_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The path id is the CLIENT, even though a list is what gets created. */
Deno.test("list-create: POSTs to /lists/{clientid}.json", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: JSON.stringify("a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1"),
  }]);
  const out = await listCreate.execute({ clientId: "cid", title: "Website Subscribers" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/lists/cid.json`);
  // The endpoint answers a bare JSON string, wrapped here into an object.
  assertEquals(out, { ListID: "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" });
});

Deno.test("list-create: defaults to AllClientLists, the vendor's recommendation", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("lid") }]);
  await listCreate.execute({ clientId: "cid", title: "T" }, ctx);
  assertEquals(bodyOf(calls[0]).UnsubscribeSetting, "AllClientLists");
  assertEquals(bodyOf(calls[0]).ConfirmedOptIn, false);
});

Deno.test("list-create: sends every documented field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JSON.stringify("lid") }]);
  await listCreate.execute({
    clientId: "cid",
    title: "T",
    unsubscribeSetting: "OnlyThisList",
    confirmedOptIn: true,
    unsubscribePage: "https://example.com/bye",
    confirmationSuccessPage: "https://example.com/hi",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    Title: "T",
    UnsubscribeSetting: "OnlyThisList",
    ConfirmedOptIn: true,
    UnsubscribePage: "https://example.com/bye",
    ConfirmationSuccessPage: "https://example.com/hi",
  });
});

/** A repeat with the same title fails with code 250, so a retry is not a no-op. */
Deno.test("list-create: is declared NOT idempotent", () => {
  assertEquals(listCreate.idempotent, false);
});
