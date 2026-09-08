import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-delete.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("lead-delete: requires confirm=true before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: 1, confirm: false }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("lead-delete: calls crm.lead.delete and returns deleted:true on success", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: true, time: {} } },
  ], { display });

  const out = await action.execute({ id: 9, confirm: true }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.lead.delete");
  assertEquals(JSON.parse(calls[0].body!), { id: 9 });
  assertEquals(out, { id: 9, deleted: true });
});

Deno.test("lead-delete: the confirm param is required and defaults to false", () => {
  const confirm = action.params!.find((p) => p.key === "confirm")!;
  assertEquals(confirm.required, true);
  assertEquals(confirm.default, false);
});
