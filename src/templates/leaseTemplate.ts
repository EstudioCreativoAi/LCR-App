import { formatPrice } from '../utils/currency'

export type LeaseTemplateData = {
  landlordName: string
  renterName: string
  propertyAddress: string
  propertyCity: string
  monthlyRent: number
  depositAmount: number
  startDate: string
  endDate: string
  leaseMonths: number
  signatureBase64: string
  signedDate: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function generateLeaseHtml(data: LeaseTemplateData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page { margin: 40px 50px; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 40px 50px;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 {
    font-size: 22px;
    text-align: center;
    margin-bottom: 4px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  h2 {
    font-size: 13px;
    text-align: center;
    font-weight: normal;
    color: #666;
    margin-bottom: 30px;
  }
  .date-line {
    text-align: right;
    margin-bottom: 24px;
    font-style: italic;
    color: #555;
  }
  .section-title {
    font-size: 14px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 24px;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
  }
  .parties-table {
    width: 100%;
    margin-bottom: 8px;
  }
  .parties-table td {
    padding: 4px 0;
    vertical-align: top;
  }
  .parties-table td:first-child {
    font-weight: bold;
    width: 120px;
  }
  .terms-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  .terms-table td {
    padding: 6px 0;
    border-bottom: 1px solid #eee;
  }
  .terms-table td:first-child {
    width: 160px;
    color: #555;
  }
  .terms-table td:last-child {
    font-weight: bold;
    text-align: right;
  }
  .clause {
    margin-bottom: 14px;
    text-align: justify;
  }
  .clause strong {
    display: block;
    margin-bottom: 2px;
  }
  .signatures {
    margin-top: 40px;
    page-break-inside: avoid;
  }
  .sig-row {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
  }
  .sig-block {
    width: 45%;
  }
  .sig-label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .sig-line {
    border-bottom: 1px solid #333;
    min-height: 50px;
    margin-bottom: 4px;
    display: flex;
    align-items: flex-end;
  }
  .sig-line img {
    max-height: 50px;
    max-width: 100%;
  }
  .sig-name {
    font-weight: bold;
    font-size: 12px;
  }
  .sig-date {
    font-size: 11px;
    color: #666;
  }
  .platform-note {
    font-style: italic;
    font-size: 11px;
    color: #888;
  }
  .footer {
    margin-top: 40px;
    text-align: center;
    font-size: 10px;
    color: #aaa;
    border-top: 1px solid #ddd;
    padding-top: 12px;
  }
</style>
</head>
<body>

<h1>Los Cabos Residential Lease</h1>
<h2>Agreement</h2>

<p class="date-line">Effective Date: ${formatDate(data.startDate)}</p>

<div class="section-title">Parties</div>
<table class="parties-table">
  <tr>
    <td>Landlord:</td>
    <td>${data.landlordName}</td>
  </tr>
  <tr>
    <td>Tenant:</td>
    <td>${data.renterName}</td>
  </tr>
</table>

<div class="section-title">Property</div>
<p style="margin-bottom: 8px;">${data.propertyAddress}, ${data.propertyCity}, Baja California Sur, Mexico</p>

<div class="section-title">Lease Terms</div>
<table class="terms-table">
  <tr>
    <td>Monthly Rent</td>
    <td>${formatPrice(data.monthlyRent)}</td>
  </tr>
  <tr>
    <td>Security Deposit</td>
    <td>${formatPrice(data.depositAmount)}</td>
  </tr>
  <tr>
    <td>Lease Start</td>
    <td>${formatDate(data.startDate)}</td>
  </tr>
  <tr>
    <td>Lease End</td>
    <td>${formatDate(data.endDate)}</td>
  </tr>
  <tr>
    <td>Duration</td>
    <td>${data.leaseMonths} months</td>
  </tr>
</table>

<div class="section-title">Terms and Conditions</div>

<div class="clause">
  <strong>1. Rent Payment</strong>
  Tenant agrees to pay the monthly rent of ${formatPrice(data.monthlyRent)} on or before the first day of each calendar month. Rent shall be paid through the Los Cabos Rentals platform or by bank transfer as agreed between the parties. Late payments exceeding five (5) business days shall incur a late fee of 5% of the monthly rent.
</div>

<div class="clause">
  <strong>2. Security Deposit</strong>
  The Tenant shall pay a security deposit of ${formatPrice(data.depositAmount)} prior to taking possession of the property. The deposit shall be held by the Landlord and returned within thirty (30) days of lease termination, less any deductions for damages beyond normal wear and tear, unpaid rent, or cleaning costs.
</div>

<div class="clause">
  <strong>3. Property Condition</strong>
  The Tenant acknowledges receiving the property in good and habitable condition. The Tenant shall maintain the property in the same condition, subject to reasonable wear and tear. Any alterations or improvements require prior written consent from the Landlord.
</div>

<div class="clause">
  <strong>4. Maintenance and Repairs</strong>
  The Landlord shall be responsible for major structural repairs and maintenance of essential systems (plumbing, electrical, air conditioning). The Tenant shall be responsible for minor maintenance, including replacing light bulbs, air filters, and keeping the property clean and pest-free.
</div>

<div class="clause">
  <strong>5. Early Termination</strong>
  Either party may terminate this agreement with sixty (60) days written notice. If the Tenant terminates early, the security deposit shall be forfeited unless mutually agreed otherwise. The Landlord may terminate immediately for material breach, including non-payment of rent exceeding fifteen (15) days.
</div>

<div class="clause">
  <strong>6. Governing Law</strong>
  This agreement shall be governed by the civil laws of the State of Baja California Sur, Mexico. Any disputes arising from this agreement shall be resolved in the courts of Los Cabos, B.C.S., Mexico.
</div>

<div class="signatures">
  <div class="section-title">Signatures</div>
  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-label">Landlord</div>
      <div class="sig-line">
        <span class="platform-note">Approved via platform</span>
      </div>
      <div class="sig-name">${data.landlordName}</div>
      <div class="sig-date">Approved upon sending lease</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Tenant</div>
      <div class="sig-line">
        <img src="${data.signatureBase64}" alt="Tenant Signature" />
      </div>
      <div class="sig-name">${data.renterName}</div>
      <div class="sig-date">Signed: ${formatDate(data.signedDate)}</div>
    </div>
  </div>
</div>

<div class="footer">
  Generated by Los Cabos Rentals &middot; This document constitutes a binding residential lease agreement
</div>

</body>
</html>`
}

export function generateLeasePreviewHtml(data: Omit<LeaseTemplateData, 'signatureBase64' | 'signedDate'>): string {
  return generateLeaseHtml({
    ...data,
    signatureBase64: '',
    signedDate: new Date().toISOString(),
  }).replace(
    '<img src="" alt="Tenant Signature" />',
    '<span style="color:#999;font-style:italic;">Pending signature</span>'
  )
}
