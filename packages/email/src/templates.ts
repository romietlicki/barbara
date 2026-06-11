export function digestFailureHtml(
  tenantName: string,
  digestDate: string,
  errorMessage: string,
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Falha no envio do digest</title></head>
<body style="font-family:sans-serif;color:#374151;background:#f9fafb;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#dc2626;font-size:18px;margin-top:0">Falha no envio do digest</h2>
    <p style="margin:0 0 16px">
      O digest de <strong>${escapeHtml(tenantName)}</strong> do dia
      <strong>${escapeHtml(digestDate)}</strong> não pôde ser enviado
      após todas as tentativas.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px">
      <code style="font-size:12px;color:#b91c1c;word-break:break-all">${escapeHtml(errorMessage)}</code>
    </div>
    <p style="color:#6b7280;font-size:14px;margin:0">
      Verifique se o email do cliente está configurado no painel.
    </p>
  </div>
</body>
</html>`
}

export function waDisconnectedHtml(tenantName: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>WhatsApp desconectado</title></head>
<body style="font-family:sans-serif;color:#374151;background:#f9fafb;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#d97706;font-size:18px;margin-top:0">WhatsApp desconectado</h2>
    <p style="margin:0 0 16px">
      O WhatsApp de <strong>${escapeHtml(tenantName)}</strong> foi desconectado.
      Os grupos não serão monitorados e os digests não serão enviados até que a conexão seja restaurada.
    </p>
    <p style="color:#6b7280;font-size:14px;margin:0">
      Acesse o painel para reconectar o WhatsApp escaneando um novo QR code.
    </p>
  </div>
</body>
</html>`
}

export function digestEmailHtml(
  tenantName: string,
  dateLabel: string,
  contentMd: string,
): string {
  const contentHtml = markdownToHtml(contentMd)
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Digest ${escapeHtml(dateLabel)} — ${escapeHtml(tenantName)}</title>
</head>
<body style="font-family:sans-serif;color:#374151;background:#f9fafb;padding:24px;margin:0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:var(--brand,#6366f1);padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#fff">Barbara</h1>
      <p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">
        Resumo do dia ${escapeHtml(dateLabel)} · ${escapeHtml(tenantName)}
      </p>
    </div>
    <div style="padding:32px">
      ${contentHtml}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;background:#f9fafb">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Gerado automaticamente pela Barbara · Resumo diário de grupos de WhatsApp
      </p>
    </div>
  </div>
</body>
</html>`
}

export function passwordResetHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Redefinir senha — Barbara</title></head>
<body style="font-family:sans-serif;color:#374151;background:#f9fafb;padding:24px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="font-size:18px;margin-top:0;color:#111827">Redefinir sua senha</h2>
    <p style="margin:0 0 16px">
      Olá, <strong>${escapeHtml(name)}</strong>!
    </p>
    <p style="margin:0 0 24px;color:#6b7280">
      Recebemos uma solicitação para redefinir a senha da sua conta Barbara.
      Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
    </p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${escapeHtml(resetUrl)}"
         style="display:inline-block;padding:12px 32px;background:#6366f1;color:#fff;
                text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
        Redefinir senha
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;margin:0">
      Se você não solicitou a redefinição, ignore este email. Sua senha permanece a mesma.
    </p>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToHtml(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('## '))
        return `<h2 style="font-size:18px;font-weight:700;color:#111827;margin:24px 0 8px">${escapeHtml(line.slice(3))}</h2>`
      if (line.startsWith('### '))
        return `<h3 style="font-size:15px;font-weight:600;color:#374151;margin:16px 0 6px">${escapeHtml(line.slice(4))}</h3>`
      if (line.startsWith('📌 '))
        return `<h2 style="font-size:17px;font-weight:700;color:#111827;margin:28px 0 8px;padding-bottom:8px;border-bottom:2px solid #e5e7eb">${escapeHtml(line)}</h2>`
      if (line.startsWith('📝 '))
        return `<p style="font-weight:600;color:#374151;margin:12px 0 4px">${escapeHtml(line)}</p>`
      if (line.startsWith('✅ '))
        return `<p style="font-weight:600;color:#374151;margin:12px 0 4px">${escapeHtml(line)}</p>`
      if (line.startsWith('- '))
        return `<div style="padding:4px 0 4px 16px;color:#374151">${escapeHtml(line.slice(2))}</div>`
      if (line.startsWith('---'))
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">`
      if (line.startsWith('Total:'))
        return `<p style="font-size:13px;color:#6b7280;margin:16px 0 0;font-style:italic">${escapeHtml(line)}</p>`
      if (line === '')
        return ''
      return `<p style="margin:6px 0;color:#374151">${escapeHtml(line)}</p>`
    })
    .join('\n')
}
