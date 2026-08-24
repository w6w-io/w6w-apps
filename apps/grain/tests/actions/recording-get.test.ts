import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-get.ts";

Deno.test("recording-get: POSTs /v2/recordings/:id with only the include object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", title: "All Hands" } }]);
  const result = await action.execute({ recordingId: "r1", includeParticipants: true }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/_/public-api/v2/recordings/r1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { include: { participants: true } });
  assertEquals(result, { id: "r1", title: "All Hands" });
});

Deno.test("recording-get: sends an empty body when no include flag is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  await action.execute({ recordingId: "r1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("recording-get: URL-encodes the recording id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ recordingId: "r/1 x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r%2F1%20x");
});

Deno.test("recording-get: is a read action returning the recording verbatim", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "recording");
});
