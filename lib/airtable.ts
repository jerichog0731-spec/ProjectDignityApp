import { getAirtableConfig } from "@/lib/config/env";
import type { ClientRecord } from "@/lib/types";

type AirtableFields = Record<string, unknown>;

type AirtableRecord<T> = {
  id: string;
  fields: T;
  createdTime?: string;
};

type AirtableListResponse<T> = {
  records: AirtableRecord<T>[];
};

function baseUrl(tableName: string): string {
  const { baseId } = getAirtableConfig();
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
}

async function airtableRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { apiKey } = getAirtableConfig();
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

function mapClientFields(fields: AirtableFields): ClientRecord {
  return {
    ClientID: String(fields.ClientID ?? ""),
    FirstName: String(fields.FirstName ?? ""),
    FamilySize: Number(fields.FamilySize ?? 0),
    LastHygieneDate: (fields.LastHygieneDate as string | null) ?? null,
    LastLaundryDate: (fields.LastLaundryDate as string | null) ?? null,
    LastCleaningDate: (fields.LastCleaningDate as string | null) ?? null,
    LastSpecialDate: (fields.LastSpecialDate as string | null) ?? null,
  };
}

export async function createClientRecord(
  client: ClientRecord,
): Promise<ClientRecord> {
  const { clientsTable } = getAirtableConfig();
  const data = await airtableRequest<AirtableRecord<AirtableFields>>(
    baseUrl(clientsTable),
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          ClientID: client.ClientID,
          FirstName: client.FirstName,
          FamilySize: client.FamilySize,
        },
      }),
    },
  );
  return mapClientFields(data.fields);
}

export async function getClientByClientId(
  clientId: string,
): Promise<ClientRecord | null> {
  const { clientsTable } = getAirtableConfig();
  const formula = encodeURIComponent(`{ClientID}='${clientId.replace(/'/g, "\\'")}'`);
  const data = await airtableRequest<AirtableListResponse<AirtableFields>>(
    `${baseUrl(clientsTable)}?filterByFormula=${formula}&maxRecords=1`,
  );
  const record = data.records[0];
  if (!record) return null;
  return mapClientFields(record.fields);
}
