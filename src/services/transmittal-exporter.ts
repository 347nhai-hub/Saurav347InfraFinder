/**
 * Audit & Drawing Transmittal Exporter
 * Generates standardized engineering document transmittals (CSV and Excel XML)
 * for project handover, consultant reviews, and contractual compliance.
 */

import { IndexedDocumentRecord } from '../db/schema';

export interface TransmittalHeader {
  projectTitle: string;
  transmittalNumber: string;
  sender: string;
  recipient: string;
  date: string;
  purpose: 'For Approval' | 'For Information' | 'For Construction' | 'As-Built Record';
}

function escapeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes drawing & document records into RFC-4180 compliant CSV transmittal format.
 */
export function serializeToTransmittalCsv(
  documents: IndexedDocumentRecord[],
  header: TransmittalHeader = {
    projectTitle: 'National Highway Expansion Project - Package 01',
    transmittalNumber: `TRN-NH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    sender: 'Concessionaire Engineering Team',
    recipient: 'Independent Engineer / Authority',
    date: new Date().toISOString().split('T')[0],
    purpose: 'For Approval',
  }
): string {
  const lines: string[] = [];

  // Transmittal Header Metadata
  lines.push(`DOCUMENT TRANSMITTAL NOTICE`);
  lines.push(`Project,${escapeCsvCell(header.projectTitle)}`);
  lines.push(`Transmittal No,${escapeCsvCell(header.transmittalNumber)}`);
  lines.push(`Date,${escapeCsvCell(header.date)}`);
  lines.push(`Sender,${escapeCsvCell(header.sender)}`);
  lines.push(`Recipient,${escapeCsvCell(header.recipient)}`);
  lines.push(`Purpose of Issue,${escapeCsvCell(header.purpose)}`);
  lines.push(``); // Blank line separator

  // Column Headers
  const columns = [
    'Item No.',
    'Document / Drawing Name',
    'Category',
    'Package',
    'Department',
    'Revision',
    'Status',
    'Chainage Start (m)',
    'Chainage End (m)',
    'File Size (KB)',
    'Last Modified',
    'SHA-256 Hash',
    'Relative Path',
  ];
  lines.push(columns.map(escapeCsvCell).join(','));

  // Document Rows
  documents.forEach((doc, index) => {
    const row = [
      index + 1,
      doc.name,
      doc.category,
      doc.packageCode || 'N/A',
      doc.department || 'N/A',
      doc.revisionTag || (doc.isSuperseded ? 'Superseded' : 'Current'),
      doc.status,
      doc.chainageStartM !== undefined ? doc.chainageStartM : '',
      doc.chainageEndM !== undefined ? doc.chainageEndM : '',
      Math.round(doc.sizeBytes / 1024),
      new Date(doc.modifiedAt).toISOString().replace('T', ' ').slice(0, 19),
      doc.hashSha256 || 'Pending Hash',
      doc.path,
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  });

  return lines.join('\r\n');
}

/**
 * Generates an Excel Spreadsheet 2003 XML string with styled headers and table layout.
 */
export function serializeToExcelXml(
  documents: IndexedDocumentRecord[],
  header: TransmittalHeader
): string {
  const rowsXml = documents.map((doc, i) => `
    <Row>
      <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.name)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.category)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.packageCode || '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.department || '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.revisionTag || 'Current')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.status)}</Data></Cell>
      <Cell><Data ss:Type="String">${doc.chainageStartM ?? ''}</Data></Cell>
      <Cell><Data ss:Type="String">${doc.chainageEndM ?? ''}</Data></Cell>
      <Cell><Data ss:Type="Number">${Math.round(doc.sizeBytes / 1024)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.hashSha256 || '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(doc.path)}</Data></Cell>
    </Row>`).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Transmittal_${header.transmittalNumber}">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Item</Data></Cell>
    <Cell><Data ss:Type="String">Document Title</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
    <Cell><Data ss:Type="String">Package</Data></Cell>
    <Cell><Data ss:Type="String">Department</Data></Cell>
    <Cell><Data ss:Type="String">Revision</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">CH Start (m)</Data></Cell>
    <Cell><Data ss:Type="String">CH End (m)</Data></Cell>
    <Cell><Data ss:Type="String">Size (KB)</Data></Cell>
    <Cell><Data ss:Type="String">SHA-256</Data></Cell>
    <Cell><Data ss:Type="String">Path</Data></Cell>
   </Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Triggers a client-side file download for the transmittal in browser/desktop environments.
 */
export function downloadTransmittalFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
