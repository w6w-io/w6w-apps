import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/app-fields-get.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("app-fields-get: GETs /k/v1/app/form/fields.json?app=... (not `id=`)", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { properties: { Text: { type: "SINGLE_LINE_TEXT" } }, revision: "3" } }],
    conn,
  );
  const out = await action.execute({ appId: "1" }, ctx);
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/app/form/fields.json?app=1");
  assertEquals(out.revision, "3");
});

Deno.test("app-fields-get: passes lang through when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: {}, revision: "1" } }], conn);
  await action.execute({ appId: "1", lang: "en" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("lang"), "en");
});
