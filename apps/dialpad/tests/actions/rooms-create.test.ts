import { assertEquals } from "@std/assert";
import roomsCreate from "../../actions/rooms-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rooms-create: POSTs /rooms with office id coerced to a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await roomsCreate.execute({ name: "Blackcomb", officeId: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/rooms");
  assertEquals(JSON.parse(calls[0].body!), { name: "Blackcomb", office_id: 5 });
});

Deno.test("rooms-create: declared non-idempotent", () => {
  assertEquals(roomsCreate.idempotent, false);
});
