// Tipos dos payloads de cada job — contratos entre producer e worker

export interface IngestMessageJobData {
  tenantId: string
  groupId: string    // ID interno (Postgres)
  waGroupId: string  // ID do WhatsApp (@g.us)
  waMessageId: string
}

export interface GenerateDigestJobData {
  tenantId: string
  // date é computada pelo worker no momento da execução usando o timezone do tenant
}

export interface SendDigestJobData {
  tenantId: string
  digestId: string
}

export interface GenerateEventClientDigestJobData {
  tenantId: string
  eventClientId: string
}
