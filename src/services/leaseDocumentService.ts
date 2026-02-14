import { supabase } from '../lib/supabase'
import { generateLeaseHtml } from '../templates/leaseTemplate'
import type { LeaseTemplateData } from '../templates/leaseTemplate'

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

export async function generateLeasePdf(data: LeaseTemplateData): Promise<Blob> {
  const html = generateLeaseHtml(data)

  const html2pdf = (await import('html2pdf.js')).default

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  document.body.appendChild(container)

  try {
    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: 0,
        filename: 'lease.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'px', format: [800, 1130], orientation: 'portrait' },
      })
      .from(container)
      .outputPdf('blob')

    return pdfBlob
  } finally {
    document.body.removeChild(container)
  }
}

export async function uploadSignature(leaseId: string, base64Png: string): Promise<string> {
  const blob = base64ToBlob(base64Png, 'image/png')

  const path = `${leaseId}/signature.png`
  const { error } = await supabase.storage
    .from('leases')
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) throw new Error(`Failed to upload signature: ${error.message}`)

  const { data: urlData } = supabase.storage.from('leases').getPublicUrl(path)
  return urlData.publicUrl
}

export async function uploadLeasePdf(leaseId: string, pdfBlob: Blob): Promise<string> {
  const path = `${leaseId}/lease-signed.pdf`
  const { error } = await supabase.storage
    .from('leases')
    .upload(path, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) throw new Error(`Failed to upload lease PDF: ${error.message}`)

  const { data: urlData } = supabase.storage.from('leases').getPublicUrl(path)
  return urlData.publicUrl
}

export async function finalizeLease(
  leaseId: string,
  signatureUrl: string,
  documentUrl: string
): Promise<void> {
  const { error } = await (supabase.from('leases') as any)
    .update({
      signature_url: signatureUrl,
      document_url: documentUrl,
      signed_at: new Date().toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leaseId)
    .eq('status', 'sent_for_signature')

  if (error) throw new Error(`Failed to finalize lease: ${error.message}`)
}
