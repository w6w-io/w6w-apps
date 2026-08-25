import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { toList } from "../lib/params.ts";

interface Input {
  fromNumber: string;
  number: string;
  mediaUrls: string[] | string;
  sendStyle?: string;
  seatId?: string;
  statusCallback?: string;
}

/**
 * `POST /api/send-carousel` — a swipeable multi-image carousel. Requires a V2
 * (Mac Mini) line and 2–20 HTTPS image URLs; a single image should use
 * `message-send`'s `mediaUrl` instead — the vendor's own error message for a
 * 1-item array says exactly this.
 */
const carouselSend: ActionDefinition<Input> = {
  key: "carousel-send",
  type: "perform",
  resource: "message",
  title: "Send Carousel",
  description: "Send 2–20 HTTPS images as a swipeable carousel. Requires a V2 (Mac Mini) line.",
  idempotent: false,
  params: [
    { key: "fromNumber", label: "From (V2 Sendblue number)", type: "string", required: true },
    { key: "number", label: "To", type: "string", required: true },
    {
      key: "mediaUrls",
      label: "Image URLs (2–20, HTTPS)",
      type: "multiselect",
      required: true,
    },
    {
      key: "sendStyle",
      label: "Expressive send style",
      type: "select",
      options: [
        "celebration",
        "shooting_star",
        "fireworks",
        "lasers",
        "love",
        "confetti",
        "balloons",
        "spotlight",
        "echo",
        "invisible",
        "gentle",
        "loud",
        "slam",
      ].map((v) => ({ value: v, label: v })),
      advanced: true,
    },
    { key: "seatId", label: "Seat ID", type: "string", advanced: true },
    { key: "statusCallback", label: "Status callback URL", type: "string", advanced: true },
  ],
  output: [
    { key: "message_handle", type: "string", label: "Message handle" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/send-carousel",
      compact({
        from_number: input.fromNumber,
        number: input.number,
        media_urls: toList(input.mediaUrls),
        send_style: input.sendStyle,
        seat_id: input.seatId,
        status_callback: input.statusCallback,
      }),
    );
  },
};

export default carouselSend;
