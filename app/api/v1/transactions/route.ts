import { NextResponse } from "next/server";
import { getAdminPin } from "@/lib/config/env";
import { getClientByClientId, createClientRecord } from "@/lib/airtable";
import fs from "fs";
import path from "path";

// Locate the local-first database file path in AppData
function getDbPath(): string {
  const appData =
    process.env.APPDATA ||
    (process.platform === "darwin"
      ? process.env.HOME + "/Library/Application Support"
      : process.env.HOME + "/.config");
  
  return path.join(appData, "project-dignity-core", "db.json");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      category?: "Hygiene" | "Laundry" | "Cleaning" | "Special";
      pin?: string;
    };

    const { clientId, category, pin } = body;

    // 1. Basic validation
    if (!clientId || !category || !pin) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. PIN authentication
    if (pin !== getAdminPin()) {
      return NextResponse.json({ error: "Invalid Admin PIN" }, { status: 403 });
    }

    // 3. Load database
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "Database not found" }, { status: 500 });
    }

    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    const clientIndex = db.clients.findIndex((c: any) => c.ClientID === clientId);

    if (clientIndex === -1) {
      return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
    }

    const client = db.clients[clientIndex];
    const timestamp = new Date().toISOString();

    // 4. Update the corresponding date based on category
    if (category === "Hygiene") {
      client.LastHygieneDate = timestamp;
    } else if (category === "Laundry") {
      client.LastLaundryDate = timestamp;
    } else if (category === "Cleaning") {
      client.LastCleaningDate = timestamp;
    } else if (category === "Special") {
      client.LastSpecialDate = timestamp;
    } else {
      return NextResponse.json({ error: "Invalid supply category" }, { status: 400 });
    }

    // 5. Append transaction entry
    const newTransaction = {
      TransactionID: db.transactions.length + 1,
      ClientID: clientId,
      Category: category,
      Timestamp: timestamp,
    };
    db.transactions.push(newTransaction);

    // Save database
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

    return NextResponse.json({ client, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record dispense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
