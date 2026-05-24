import fs from "fs";
import path from "path";
import type { ClientRecord } from "@/lib/types";

// Local Database Structure
type Database = {
  clients: ClientRecord[];
  transactions: any[];
};

// Locate the local-first database file path in AppData Roaming folder
function getDbPath(): string {
  const appData =
    process.env.APPDATA ||
    (process.platform === "darwin"
      ? process.env.HOME + "/Library/Application Support"
      : process.env.HOME + "/.config");
  
  const dir = path.join(appData, "project-dignity-core");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "db.json");
}

// Read database helper
function readDb(): Database {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    const defaultDb: Database = { clients: [], transactions: [] };
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), "utf8");
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data) as Database;
  } catch (e) {
    console.error("Failed to read local DB, resetting to empty:", e);
    return { clients: [], transactions: [] };
  }
}

// Write database helper
function writeDb(db: Database) {
  const dbPath = getDbPath();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write to local DB:", e);
  }
}

export async function createClientRecord(
  client: ClientRecord,
): Promise<ClientRecord> {
  const db = readDb();
  
  // Format the client record
  const newClient: ClientRecord = {
    ClientID: client.ClientID,
    FirstName: client.FirstName,
    FamilySize: client.FamilySize,
    LastHygieneDate: client.LastHygieneDate ?? null,
    LastLaundryDate: client.LastLaundryDate ?? null,
    LastCleaningDate: client.LastCleaningDate ?? null,
    LastSpecialDate: client.LastSpecialDate ?? null,
  };

  db.clients.push(newClient);
  writeDb(db);
  return newClient;
}

export async function getClientByClientId(
  clientId: string,
): Promise<ClientRecord | null> {
  const db = readDb();
  const client = db.clients.find((c) => c.ClientID === clientId);
  return client ?? null;
}
