import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("lead-get: fetches crm.lead.get with the numeric id and returns the raw lead", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: { ID: "5", TITLE: "A Lead" }, time: {} } },
  ], { display });

  const out = await action.execute({ id: 5 }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.lead.get");
  assertEquals(JSON.parse(calls[0].body!), { id: 5 });
  assertEquals(out, { ID: "5", TITLE: "A Lead" });
});

Deno.test("lead-get: rejects a non-numeric id before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: NaN }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("lead-get: a NO_AUTH_FOUND body throws with the vendor's own message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { error: "NO_AUTH_FOUND", error_description: "Wrong authorization data" },
    },
  ], { display });
  await assertRejects(
    async () => {
      await action.execute({ id: 1 }, ctx);
    },
    Error,
    "NO_AUTH_FOUND",
  );
});
