import { assertEquals } from "@std/assert";
import boxUpdate from "../../actions/box-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("box-update: POSTs a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "b1", name: "Renamed" } }]);
  await boxUpdate.execute({ boxKey: "b1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

/**
 * Unlike box-create's assignedToSharingEntries (a JSON-string of email
 * objects), box-update's field of the same name is a plain array of user
 * KEYS, sent as a real JSON array. Mixing the two shapes up is the trap.
 */
Deno.test("box-update: assignedToUserKeys is sent as a real array, not stringified", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "b1" } }]);
  await boxUpdate.execute({ boxKey: "b1", assignedToUserKeys: ["u1", "u2"] }, ctx);
  const body = JSON.parse(calls[0].body!) as { assignedToSharingEntries: unknown };
  assertEquals(body.assignedToSharingEntries, ["u1", "u2"]);
});

/**
 * `fields` is `format: "json"` on a `type: "string"` property — a normal
 * object in, a JSON string on the wire.
 */
Deno.test("box-update: fields is re-encoded as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "b1" } }]);
  await boxUpdate.execute({ boxKey: "b1", fields: { "1007": "a value", "1039": 42 } }, ctx);
  const body = JSON.parse(calls[0].body!) as { fields: unknown };
  assertEquals(typeof body.fields, "string");
  assertEquals(JSON.parse(body.fields as string), { "1007": "a value", "1039": 42 });
});

Deno.test("box-update: fields also accepts a JSON string directly", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "b1" } }]);
  await boxUpdate.execute({ boxKey: "b1", fields: '{"1007":"a value"}' }, ctx);
  const body = JSON.parse(calls[0].body!) as { fields: unknown };
  assertEquals(body.fields, '{"1007":"a value"}');
});
