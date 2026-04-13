import { NextRequest, NextResponse } from "next/server";

const PIXEL_ID    = process.env.META_PIXEL_ID    || "840893159040582";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      data: [{
        event_name:       body.event_name,
        event_id:         body.event_id,
        event_time:       body.event_time || Math.floor(Date.now() / 1000),
        event_source_url: body.event_source_url || "",
        action_source:    "website",
        user_data: {
          ...body.user_data,
          client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] || "",
          client_user_agent:  body.user_data?.client_user_agent || "",
        },
        custom_data: body.custom_data,
      }],
    };

    const r = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );

    const data = await r.json();
    return NextResponse.json(data, { status: r.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
