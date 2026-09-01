import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, FreeAgentClient, jsonArray, jsonObject, ref } from "../../lib/client.ts";

Deno.test("ref: builds the full resource URL FreeAgent expects for a reference field", () => {
  assertEquals(ref("contacts", 2), "https://api.freeagent.com/v2/contacts/2");
  assertEquals(ref("tasks", "10"), "https://api.freeagent.com/v2/tasks/10");
});

Deno.test("compact: drops undefined/null/empty-string values, keeps falsy-but-real ones", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: 0, e: false, f: "x" }), {
    d: 0,
    e: false,
    f: "x",
  });
});

Deno.test("jsonObject: accepts a plain object and a JSON string, rejects an array", () => {
  assertEquals(jsonObject({ a: 1 }, "fields"), { a: 1 });
  assertEquals(jsonObject('{"a":1}', "fields"), { a: 1 });
  assertEquals(jsonObject(undefined, "fields"), {});
  let threw = false;
  try {
    jsonObject([1, 2], "fields");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "`fields` must be a JSON object.");
  }
  assertEquals(threw, true);
});

Deno.test("jsonArray: accepts an array, rejects a non-array", () => {
  assertEquals(jsonArray([1, 2], "invoiceItems"), [1, 2]);
  let threw = false;
  try {
    jsonArray({ a: 1 }, "invoiceItems");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "`invoiceItems` must be a JSON array.");
  }
  assertEquals(threw, true);
});

Deno.test("FreeAgentClient: GET drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new FreeAgentClient(ctx).request("/contacts", {
    query: { view: "active", sort: undefined, page: undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("view"), "active");
  assertEquals(url.searchParams.has("sort"), false);
  assertEquals(url.searchParams.has("page"), false);
});

Deno.test("FreeAgentClient: throws a message built from FreeAgent's own error shape", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: { message: "Name can't be blank" } } }]);
  await assertRejects(
    () => new FreeAgentClient(ctx).request("/contacts", { method: "POST", body: {} }),
    Error,
    "Name can't be blank",
  );
});

Deno.test("FreeAgentClient: returns undefined for an empty 200 body (e.g. a DELETE)", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  const out = await new FreeAgentClient(ctx).request("/contacts/1", { method: "DELETE" });
  assertEquals(out, undefined);
});
