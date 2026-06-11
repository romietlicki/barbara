// Cliente HTTP para a Evolution API v2
// Docs: https://doc.evolution-api.com/

import type { InstanceStatus, QrCodeResponse, SendMessageResponse } from './types'
export type { InstanceStatus, QrCodeResponse, SendMessageResponse }

export class EvolutionApiClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    baseUrl = process.env['EVOLUTION_API_URL'] ?? 'http://localhost:8080',
    apiKey = process.env['EVOLUTION_API_KEY'] ?? '',
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Evolution API ${method} ${path} → ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  // Cria uma nova instância WA. instanceName deve ser o tenantId para facilitar lookup.
  // Compatível com Evolution API v1.8.x: criação e webhook são chamadas separadas.
  async createInstance(
    instanceName: string,
    webhookUrl: string,
    webhookSecret: string,
  ): Promise<void> {
    await this.request<unknown>('POST', '/instance/create', {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    })

    await this.request<unknown>('POST', `/webhook/set/${instanceName}`, {
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      headers: { 'X-Webhook-Token': webhookSecret },
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'GROUPS_UPSERT'],
    })

    // groups_ignore: false é obrigatório para capturar mensagens de grupos
    await this.request<unknown>('POST', `/settings/set/${instanceName}`, {
      reject_call: false,
      groups_ignore: false,
      always_online: false,
      read_messages: false,
      read_status: false,
      sync_full_history: false,
      wavoipToken: 'none',
    })
  }

  // Retorna QR code para o usuário escanear e conectar o WhatsApp.
  async getQrCode(instanceName: string): Promise<QrCodeResponse> {
    return this.request<QrCodeResponse>('GET', `/instance/connect/${instanceName}`)
  }

  // Verifica se a instância está conectada.
  // Evolution API v1 retorna { instance: { instanceName, status } } (objeto único, campo "status").
  async getStatus(instanceName: string): Promise<InstanceStatus> {
    type V1Response = { instance: { instanceName: string; status: string } }
    const data = await this.request<V1Response>(
      'GET',
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
    )
    if (!data?.instance) throw new Error(`Instância ${instanceName} não encontrada`)
    const raw = data.instance.status as InstanceStatus['state']
    return { instanceName: data.instance.instanceName, state: raw }
  }

  // Envia mensagem de texto para um número ou grupo.
  // to: número no formato internacional (ex: "5511999999999") ou groupId (@g.us)
  async sendText(
    instanceName: string,
    to: string,
    text: string,
  ): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>('POST', `/message/sendText/${instanceName}`, {
      number: to,
      text,
    })
  }

  // Retorna todos os grupos da instância com id e subject (nome real).
  async fetchAllGroups(instanceName: string): Promise<Array<{ id: string; subject: string }>> {
    type GroupsResponse = Array<{ id: string; subject?: string }>
    const data = await this.request<GroupsResponse>(
      'GET',
      `/group/fetchAllGroups/${instanceName}?getParticipants=false`,
    )
    return data.filter((g) => g.id && g.subject).map((g) => ({ id: g.id, subject: g.subject! }))
  }

  // Desconecta o WhatsApp sem remover a instância (permite reconectar depois).
  async logoutInstance(instanceName: string): Promise<void> {
    await this.request<unknown>('DELETE', `/instance/logout/${instanceName}`)
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.request<unknown>('DELETE', `/instance/delete/${instanceName}`)
  }
}
