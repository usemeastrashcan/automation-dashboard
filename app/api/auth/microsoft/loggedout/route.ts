import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Successfully logged out.",
    status: "success",
  })
}
