import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Hello from the Node.js API backend!",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  return NextResponse.json({
    message: "POST request received",
    data: body,
    timestamp: new Date().toISOString(),
  });
}