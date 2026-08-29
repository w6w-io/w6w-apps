import { assertEquals } from "@std/assert";
import roomLinkCreate from "../../actions/room-link-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-link-create: POSTs the given fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { public: true, url: "https://x", need_acceptance: false },
  }]);
  const out = await roomLinkCreate.execute({
    roomId: "5",
    code: "unique-link-name",
    needAcceptance: false,
    description: "Join us",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/link");
  assertEquals(calls[0].method, "POST");
  assertEquals(formOf(calls[0]), {
    code: "unique-link-name",
    need_acceptance: "0",
    description: "Join us",
  });
  assertEquals(out, { public: true, url: "https://x", need_acceptance: false });
});

Deno.test("room-link-create: needAcceptance defaults to the vendor's own default (omitted)", async () => {
  const { ctx, calls } = mockCtx([{ body: { public: true } }]);
  await roomLinkCreate.execute({ roomId: "5" }, ctx);
  assertEquals(formOf(calls[0]), {});
});
