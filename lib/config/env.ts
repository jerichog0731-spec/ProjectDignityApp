function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAirtableConfig() {
  return {
    apiKey: required("AIRTABLE_API_KEY"),
    baseId: required("AIRTABLE_BASE_ID"),
    clientsTable: process.env.AIRTABLE_CLIENTS_TABLE ?? "Clients",
    transactionsTable:
      process.env.AIRTABLE_TRANSACTIONS_TABLE ?? "Transactions",
  };
}

export function getAdminPin(): string {
  return required("ADMIN_PIN");
}
