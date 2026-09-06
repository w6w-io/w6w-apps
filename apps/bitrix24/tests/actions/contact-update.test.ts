import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("contact-update: sends only the provided fields with the id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: true, time: {} } },
  ], { display });

  const out = await action.execute({ id: 4, post: "Engineer" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, 4);
  assertEquals(body.fields, { POST: "Engineer" });
  assertEquals(out, { id: 4, updated: true });
});

Deno.test("contact-update: rejects when no field to change is given", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: 4 }, ctx);
  });
  assertEquals(calls.length, 0);
});
