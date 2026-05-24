export function getAirtableConfig() {
  return {
    apiKey: process.env.AIRTABLE_API_KEY ?? "",
    baseId: process.env.AIRTABLE_BASE_ID ?? "",
    clientsTable: process.env.AIRTABLE_CLIENTS_TABLE ?? "Clients",
    transactionsTable:
      process.env.AIRTABLE_TRANSACTIONS_TABLE ?? "Transactions",
  };
}

export function getAdminPin(): string {
  return process.env.ADMIN_PIN ?? "1234";
}
