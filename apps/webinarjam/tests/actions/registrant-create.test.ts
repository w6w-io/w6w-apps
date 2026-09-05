import { assertEquals } from "@std/assert";
import registrantCreate from "../../actions/registrant-create.ts";
import { formOf, mockWebinarJamCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("registrant-create: maps every field onto WebinarJam's documented names", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ user: { user_id: 1234567 } }) }]);
  await registrantCreate.execute({
    product: "webinarjam",
    webinarId: 5,
    schedule: 34,
    firstName: "FirstName",
    lastName: "LastName",
    email: "test@email.com",
    phoneCountryCode: "+1",
    phone: "1234567890",
    twilioConsent: true,
  }, ctx);
  const sent = formOf(calls[0].body);
  assertEquals(pathOf(calls[0].url), "/webinarjam/register");
  assertEquals(sent.webinar_id, "5");
  assertEquals(sent.schedule, "34");
  assertEquals(sent.first_name, "FirstName");
  assertEquals(sent.last_name, "LastName");
  assertEquals(sent.email, "test@email.com");
  assertEquals(sent.phone_country_code, "+1");
  assertEquals(sent.phone, "1234567890");
  assertEquals(sent.twilio_consent, "1");
});

Deno.test("registrant-create: custom fields are merged in by their configured label", async () => {
  const { ctx, calls } = mockWebinarJamCtx([{ body: ok({ user: {} }) }]);
  await registrantCreate.execute({
    product: "webinarjam",
    webinarId: 5,
    schedule: 34,
    firstName: "FirstName",
    email: "test@email.com",
    customFields: { company: "Acme", whereDidYouHearAboutUs: ["id_1", "id_2"] },
  }, ctx);
  const params = new URLSearchParams(calls[0].body!);
  assertEquals(params.get("company"), "Acme");
  assertEquals(params.getAll("whereDidYouHearAboutUs[]"), ["id_1", "id_2"]);
});

Deno.test("registrant-create: returns the registered attendee, including room links", async () => {
  const user = {
    webinar_id: 5,
    user_id: 1234567,
    live_room_url: "https://event.webinarjam.com/go/live/5/ab1cd2ef3",
    replay_room_url: "https://event.webinarjam.com/go/replay/5/ab1cd2ef3",
    thank_you_url: "https://event.webinarjam.com/registration/thank-you/5/ab1cd2ef3gh4",
  };
  const { ctx } = mockWebinarJamCtx([{ body: ok({ user }) }]);
  const out = await registrantCreate.execute({
    product: "webinarjam",
    webinarId: 5,
    schedule: 34,
    firstName: "F",
    email: "a@b.com",
  }, ctx) as { user: unknown };
  assertEquals(out.user, user);
});

Deno.test("registrant-create: is honestly not idempotent", () => {
  assertEquals(registrantCreate.idempotent, false);
  assertEquals(registrantCreate.type, "perform");
});
