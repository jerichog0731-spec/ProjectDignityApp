import { NextResponse } from "next/server";
import { RESOURCE_DEFINITIONS } from "@/lib/config/resources";

/** Public resource config for clients — cooldowns and labels stay in sync app-wide. */
export async function GET() {
  return NextResponse.json({
    version: 1,
    resources: RESOURCE_DEFINITIONS.map(({ id, label, cooldownDays }) => ({
      id,
      label,
      cooldownDays,
    })),
  });
}
