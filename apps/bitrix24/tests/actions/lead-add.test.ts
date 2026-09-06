import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-add.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("lead-add: posts fields to crm.lead.add and returns the new id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: 42, time: {} } },
  ], { display });

  const out = await action.execute({
    title: "IP Titov",
    name: "Gleb",
    lastName: "Titov",
    statusId: "NEW",
    opportunity: 12500,
    phone: "555888",
    email: "gleb@example.com",
  }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.lead.add");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields.TITLE, "IP Titov");
  assertEquals(body.fields.NAME, "Gleb");
  assertEquals(body.fields.LAST_NAME, "Titov");
  assertEquals(body.fields.OPPORTUNITY, 12500);
  assertEquals(body.fields.PHONE, [{ VALUE: "555888", VALUE_TYPE: "WORK" }]);
  assertEquals(body.fields.EMAIL, [{ VALUE: "gleb@example.com", VALUE_TYPE: "WORK" }]);
  assertEquals(out, { id: 42 });
});

Deno.test("lead-add: extraFields merges in, curated fields win on conflict", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: 1, time: {} } },
  ], { display });

  await action.execute({
    title: "Curated",
    extraFields: '{"TITLE":"From extra","UTM_SOURCE":"google"}',
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields.TITLE, "Curated");
  assertEquals(body.fields.UTM_SOURCE, "google");
});

Deno.test("lead-add: a 200 carrying {error} is treated as a failure, not a success", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { error: "INVALID_REQUEST", error_description: "bad fields" } },
  ], { display });

  let threw = false;
  try {
    await action.execute({ title: "x" }, ctx);
  } catch (err) {
    threw = true;
    const message = String((err as Error).message);
    if (!message.includes("INVALID_REQUEST")) throw new Error(`unexpected message: ${message}`);
  }
  if (!threw) throw new Error("expected execute to throw on an error-shaped 200");
});
