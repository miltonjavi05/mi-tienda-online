import { NextRequest, NextResponse } from "next/server";

const PIXEL_ID    = process.env.META_PIXEL_ID    || "840893159040582";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
const API_VERSION  = process.env.META_GRAPH_API_VERSION || "v25.0";
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || "";

if (!ACCESS_TOKEN) {
  console.error("META CAPI: falta META_CAPI_ACCESS_TOKEN en las variables de entorno de Vercel");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      data: [{
        event_name:       body.event_name,
        event_id:         body.event_id,
        event_time:       body.event_time || Math.floor(Date.now() / 1000),
        ...(body.event_source_url ? { event_source_url: body.event_source_url } : {}),
        action_source:    body.action_source || "website",
        user_data: {
          ...body.user_data,
          client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] || "",
          client_user_agent:  body.user_data?.client_user_agent || "",
        },
        custom_data: body.custom_data,  
      }],
    };

     if (body.test_event_code || TEST_EVENT_CODE) {
      (payload as any).test_event_code = body.test_event_code || TEST_EVENT_CODE;
    }

      const r = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );

    const data = await r.json();
    if (!r.ok) {
      console.error("META CAPI ERROR:", { pixel: PIXEL_ID, hasToken: !!ACCESS_TOKEN, event: body.event_name, data });
    } else {
      console.log("META CAPI OK:", { pixel: PIXEL_ID, event: body.event_name, event_id: body.event_id });
    }
    return NextResponse.json(data, { status: r.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
