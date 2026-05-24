import { NextResponse } from "next/server";
import { createClientRecord } from "@/lib/airtable";
import { generateClientId } from "@/lib/client-id";
import { validateOnboarding } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      firstName?: string;
      familySize?: number | string;
    };

    const validated = validateOnboarding(
      body.firstName ?? "",
      String(body.familySize ?? ""),
    );

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const clientId = generateClientId();
    const client = await createClientRecord({
      ClientID: clientId,
      FirstName: validated.firstName,
      FamilySize: validated.familySize,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create client";
    const status = message.includes("Missing required environment")
      ? 503
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
