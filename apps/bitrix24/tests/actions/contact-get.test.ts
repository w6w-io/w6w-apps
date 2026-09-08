import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("contact-get: fetches crm.contact.get with the numeric id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: { ID: "3", LAST_NAME: "Lovelace" }, time: {} } },
  ], { display });

  const out = await action.execute({ id: 3 }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.contact.get");
  assertEquals(JSON.parse(calls[0].body!), { id: 3 });
  assertEquals(out, { ID: "3", LAST_NAME: "Lovelace" });
});

Deno.test("contact-get: rejects a non-numeric id before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: NaN }, ctx);
  });
  assertEquals(calls.length, 0);
});
