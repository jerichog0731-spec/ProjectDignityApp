import { NextResponse } from "next/server";
import { getClientByClientId } from "@/lib/airtable";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { clientId } = await context.params;
    const client = await getClientByClientId(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load client";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
