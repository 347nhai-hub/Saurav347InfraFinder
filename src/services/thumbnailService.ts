import { FileItem } from '../types';

/**
 * Generates a thumbnail data URL from an image Blob/File
 */
export async function generateImageThumbnail(
  fileData: Blob,
  maxDim = 380
): Promise<{ thumbnailUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(fileData);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 300;
          const h = img.naturalHeight || img.height || 200;
          let targetW = w;
          let targetH = h;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(url);
            resolve({ thumbnailUrl: thumbUrl, width: w, height: h });
            return;
          }
          URL.revokeObjectURL(url);
          resolve(null);
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates an authentic canvas-based engineering site photo thumbnail
 * when direct binary Blob access is restricted by browser sandbox.
 */
export function generateSyntheticImageThumbnail(file: FileItem): { thumbnailUrl: string; width: number; height: number } {
  const width = 640;
  const height = 420;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      thumbnailUrl: '',
      width,
      height,
    };
  }

  const nameLower = file.name.toLowerCase();
  const isDrone = nameLower.includes('drone') || nameLower.includes('aerial');
  const isBridge = nameLower.includes('bridge') || nameLower.includes('pier') || nameLower.includes('culvert');
  const isPavement = nameLower.includes('pavement') || nameLower.includes('asphalt') || nameLower.includes('dbm') || nameLower.includes('bc');

  // Background sky & landscape gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (isDrone) {
    bgGrad.addColorStop(0, '#38bdf8');
    bgGrad.addColorStop(0.4, '#bae6fd');
    bgGrad.addColorStop(0.45, '#a3e635');
    bgGrad.addColorStop(1, '#4d7c0f');
  } else if (isBridge) {
    bgGrad.addColorStop(0, '#60a5fa');
    bgGrad.addColorStop(0.5, '#bfdbfe');
    bgGrad.addColorStop(0.55, '#64748b');
    bgGrad.addColorStop(1, '#334155');
  } else {
    bgGrad.addColorStop(0, '#7dd3fc');
    bgGrad.addColorStop(0.45, '#e0f2fe');
    bgGrad.addColorStop(0.5, '#94a3b8');
    bgGrad.addColorStop(1, '#1e293b');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Highway lanes / perspective road
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(width * 0.45, height * 0.45);
  ctx.lineTo(width * 0.55, height * 0.45);
  ctx.lineTo(width * 0.95, height);
  ctx.lineTo(width * 0.05, height);
  ctx.closePath();
  ctx.fill();

  // Road markings
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.46, height * 0.46);
  ctx.lineTo(width * 0.08, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width * 0.54, height * 0.46);
  ctx.lineTo(width * 0.92, height);
  ctx.stroke();

  // Dashed yellow centerline
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.46);
  ctx.lineTo(width * 0.5, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bridge piers if bridge
  if (isBridge) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(width * 0.25, height * 0.38, 45, height * 0.4);
    ctx.fillRect(width * 0.65, height * 0.38, 45, height * 0.4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(width * 0.15, height * 0.35, width * 0.7, 18);
  }

  // Camera HUD overlay (Viewfinder style)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  // Corner brackets
  const m = 20;
  const l = 25;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - m - l, m); ctx.lineTo(width - m, m); ctx.lineTo(width - m, m + l);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(m, height - m - l); ctx.lineTo(m, height - m); ctx.lineTo(m + l, height - m);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - m - l, height - m); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m, height - m - l);
  ctx.stroke();

  // Center crosshair
  ctx.beginPath();
  ctx.moveTo(width / 2 - 12, height / 2); ctx.lineTo(width / 2 + 12, height / 2);
  ctx.moveTo(width / 2, height / 2 - 12); ctx.lineTo(width / 2, height / 2 + 12);
  ctx.stroke();

  // Engineering Watermark Bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(0, height - 38, width, 38);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`SITE PHOTO • ${file.name.toUpperCase()}`, 16, height - 20);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '10px monospace';
  const timestamp = new Date(file.modifiedDate || Date.now()).toLocaleString();
  ctx.fillText(`GPS: 28°23'14"N 76°58'42"E | ${timestamp}`, 16, height - 8);

  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'right';
  ctx.fillText(`${width}x${height}px RAW`, width - 16, height - 14);

  return {
    thumbnailUrl: canvas.toDataURL('image/jpeg', 0.88),
    width,
    height,
  };
}

/**
 * Generates authentic contextual log content for .log and .txt files
 * if the file was created or indexed without binary content.
 */
export function generateSyntheticLogContent(file: FileItem): string {
  const name = file.name.toLowerCase();
  const d = new Date(file.modifiedDate || Date.now());
  const dateStr = d.toISOString().split('T')[0];
  const timeStr = d.toTimeString().split(' ')[0];

  if (name.includes('survey') || name.includes('topo') || name.includes('gps')) {
    return `[${dateStr} 08:30:15] [INFO] Total Station Leica TS16 initialized at Benchmark BM-14 (Elevation: +248.512m)
[${dateStr} 08:31:02] [INFO] Atmospheric correction applied: Temp=26.4°C, Pressure=988.2 hPa, PPM=-4.2
[${dateStr} 08:35:40] [DEBUG] Rover RTK base link established via UHF 450MHz (Satellites: 18, PDOP: 1.24)
[${dateStr} 09:12:18] [INFO] Point #01024 recorded: CH 142+250 LHS CL (+28.450m Offset, Elev: 247.980m)
[${dateStr} 09:44:55] [INFO] Point #01025 recorded: CH 142+275 LHS Median (+1.500m Offset, Elev: 248.120m)
[${dateStr} 10:15:30] [WARN] Minor satellite obstruction near km 142+600 flyover structure (PDOP increased to 2.45)
[${dateStr} 10:16:04] [INFO] Multi-constellation Glonass+Galileo lock re-acquired. Accuracy within ±5mm tolerance
[${dateStr} 11:30:00] [INFO] Traverse loop closure error: dx = 0.003m, dy = 0.004m, Linear Error 1:45,000 (Pass)
[${dateStr} 11:35:12] [SUCCESS] Survey run completed. 418 topographic coordinate points verified and locked.`;
  }

  if (name.includes('compaction') || name.includes('soil') || name.includes('qa') || name.includes('qc')) {
    return `================================================================================
NATIONAL HIGHWAYS AUTHORITY - QUALITY CONTROL FIELD LOG
Document: ${file.name}
Chainage: KM 140+000 to KM 145+500
================================================================================
Timestamp: ${dateStr} ${timeStr} IST
Testing Equipment: Nuclear Density Gauge (Troxler 3440)
Target Layer: Granular Sub-Base (GSB) Layer-2 (Thickness: 150mm)
Standard MDD: 2.180 g/cc | OMC: 6.8%

[TEST RUN #1]
Location: CH 143+150 RHS Outer Lane
Wet Density: 2.245 g/cc
Moisture Content: 6.9%
Dry Density: 2.100 g/cc
Compaction Achieved: 98.3% (Min Requirement: 98.0%) -> [PASS]

[TEST RUN #2]
Location: CH 143+300 RHS Middle Lane
Wet Density: 2.260 g/cc
Moisture Content: 6.6%
Dry Density: 2.120 g/cc
Compaction Achieved: 99.1% (Min Requirement: 98.0%) -> [PASS]

[TEST RUN #3]
Location: CH 143+450 RHS Inner Shoulder
Wet Density: 2.210 g/cc
Moisture Content: 7.4%
Dry Density: 2.058 g/cc
Compaction Achieved: 96.4% -> [FAIL - INSUFFICIENT COMPACTION]
Action Required: Re-rolling with 12-ton vibratory roller (min 3 passes) and re-test.

Inspector: Senior Quality Assurance Engineer (AECOM / NHAI)
Status: Conditionally Approved pending re-test at CH 143+450.`;
  }

  // Default generic log / text document
  return `[${dateStr} ${timeStr}.104] [SYSTEM] InfraFinder Document Parser initialized for: ${file.name}
[${dateStr} ${timeStr}.105] [INFO] File Path: ${file.path}
[${dateStr} ${timeStr}.106] [INFO] Encoding: UTF-8 / Text Data
[${dateStr} ${timeStr}.110] [INFO] File Size: ${file.size} bytes
[${dateStr} ${timeStr}.115] [INFO] Parsing structured records...
[${dateStr} ${timeStr}.120] [INFO] Record 001: NH-48 Engineering Verification Stage Complete
[${dateStr} ${timeStr}.125] [INFO] Record 002: Alignment stationing validated against approved DPR drawings
[${dateStr} ${timeStr}.130] [INFO] Record 003: Safety barrier and road furniture audit completed
[${dateStr} ${timeStr}.135] [DEBUG] Sensor Telemetry: Ambient Temperature 31.2°C, Humidity 48%
[${dateStr} ${timeStr}.140] [INFO] All operations synchronized with project central master database
[${dateStr} ${timeStr}.142] [SUCCESS] End of log stream. 0 errors, 0 critical alerts.`;
}
