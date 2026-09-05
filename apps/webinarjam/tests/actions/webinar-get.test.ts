import { assertEquals, assertRejects } from "@std/assert";
import webinarGet from "../../actions/webinar-get.ts";
import { failure, formOf, mockWebinarJamCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("webinar-get: sends webinar_id and returns the webinar object", async () => {
  const webinar = {
    webinar_id: 5,
    webinar_hash: "pqrs7890",
    schedules: [{
      date: "2024-01-05 13:00",
      schedule: 34,
      comment: "Friday, 5 Jan 2024, 01:00 PM",
    }],
    registration_url: "https://event.webinarjam.com/register/5/pqrs7890",
  };
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ webinar }) }]);
  const out = await webinarGet.execute({ product: "webinarjam", webinarId: 5 }, ctx) as {
    webinar: unknown;
  };
  assertEquals(pathOf(calls[0].url), "/webinarjam/webinar");
  assertEquals(formOf(calls[0].body).webinar_id, "5");
  assertEquals(out.webinar, webinar);
});

Deno.test("webinar-get: the everwebinar product hits the everwebinar prefix", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ webinar: {} }) }]);
  await webinarGet.execute({ product: "everwebinar", webinarId: 6 }, ctx);
  assertEquals(pathOf(calls[0].url), "/everwebinar/webinar");
});

Deno.test("webinar-get: an unknown webinar id surfaces the vendor's own error text", async () => {
  const { ctx } = mockWebinarJamCtx([{
    status: 401,
    body: failure({ webinar_id: "webinar not found" }),
  }]);
  await assertRejects(
    async () => {
      await webinarGet.execute({ product: "webinarjam", webinarId: 999999 }, ctx);
    },
    Error,
    "webinar not found",
  );
});

Deno.test("webinar-get: a missing webinar field returns null, not undefined", async () => {
  const { ctx } = mockWebinarJamCtx([{ body: ok() }]);
  const out = await webinarGet.execute({ product: "webinarjam", webinarId: 1 }, ctx) as {
    webinar: unknown;
  };
  assertEquals(out.webinar, null);
});
