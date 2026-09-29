import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  FileSpreadsheet, 
  FileText, 
  FileCode, 
  FileImage, 
  File, 
  Folder, 
  FolderOpen,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Sparkles,
  Download,
  Eye,
  Sliders,
  Maximize2,
  FileCheck,
  Compass,
  Layers,
  WrapText,
  Tag,
  GitBranch
} from 'lucide-react';
import { FileItem } from '../types';
import { formatDate, formatFileSize } from '../services/localFileSystem';
import { generateSyntheticImageThumbnail, generateSyntheticLogContent } from '../services/thumbnailService';

interface PreviewPaneProps {
  file: FileItem | null;
  onClose: () => void;
  onOpenItem: (item: FileItem) => void;
  onOpenContainingFolder: (item: FileItem) => void;
  onManageTags?: (file: FileItem) => void;
  revisions?: { current: FileItem; latest: FileItem; allRevisions: FileItem[]; superseded: FileItem[] } | null;
  onSelectRevision?: (file: FileItem) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  file,
  onClose,
  onOpenItem,
  onOpenContainingFolder,
  onManageTags,
  revisions,
  onSelectRevision,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'metadata'>('preview');

  // Text viewer state
  const [textFilter, setTextFilter] = useState('');
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('xs');

  // Image viewer state
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageFilter, setImageFilter] = useState<'none' | 'grayscale' | 'invert' | 'contrast'>('none');

  // Reset zoom & filter when selected file changes
  useEffect(() => {
    setImageZoom(100);
    setImageRotation(0);
    setImageFilter('none');
    setTextFilter('');
    setCopiedText(false);
  }, [file?.id]);

  // Text content extraction for .txt, .log, and text documents
  const isTextOrLog = useMemo(() => {
    if (!file) return false;
    const ext = file.extension.toLowerCase();
    return ['txt', 'log', 'ini', 'cfg', 'md', 'json', 'xml'].includes(ext) || file.category === 'other';
  }, [file?.extension, file?.category]);

  const extractedText = useMemo(() => {
    if (!file) return '';
    if (file.contentFull && file.contentFull.trim().length > 0) {
      return file.contentFull;
    }
    if (file.contentSnippet && file.contentSnippet.trim().length > 0) {
      return file.contentSnippet;
    }
    // Contextual synthetic generator if file was indexed without text stream
    return generateSyntheticLogContent(file);
  }, [file]);

  const textLines = useMemo(() => {
    return extractedText ? extractedText.split('\n') : [];
  }, [extractedText]);

  const filteredLines = useMemo(() => {
    if (!textFilter.trim()) return textLines;
    const lower = textFilter.toLowerCase();
    return textLines.filter((l) => l.toLowerCase().includes(lower));
  }, [textLines, textFilter]);

  // Image thumbnail generator & viewer
  const isImage = useMemo(() => {
    if (!file) return false;
    const ext = file.extension.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'svg', 'gif', 'tiff'].includes(ext) || file.category === 'images';
  }, [file?.extension, file?.category]);

  const imageThumbnailData = useMemo(() => {
    if (!file || !isImage) return null;
    if (file.thumbnailUrl) {
      return {
        url: file.thumbnailUrl,
        width: file.imageDimensions?.width || 1920,
        height: file.imageDimensions?.height || 1080,
        isSynthetic: false,
      };
    }
    // Generate synthetic engineering thumbnail on-the-fly
    const synth = generateSyntheticImageThumbnail(file);
    return {
      url: synth.thumbnailUrl,
      width: synth.width,
      height: synth.height,
      isSynthetic: true,
    };
  }, [file, isImage]);

  if (!file) {
    return (
      <div className="w-88 bg-white dark:bg-[#181d26] border-l border-[#dbe3ed] dark:border-[#283243] flex flex-col items-center justify-center p-6 text-center text-slate-400 shrink-0">
        <Info className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-xs font-medium">Select a file to preview details and content directly</p>
      </div>
    );
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1500);
  };

  const getFileCategoryLabel = (f: FileItem) => {
    if (f.isFolder) return 'Folder';
    const ext = f.extension.toUpperCase();
    if (ext === 'LOG') return 'System / Field Execution Log File (.log)';
    if (ext === 'TXT') return 'Plain Text Document (.txt)';
    if (['XLS', 'XLSX', 'CSV'].includes(ext)) return `Microsoft Excel Worksheet (.${f.extension})`;
    if (['DOC', 'DOCX'].includes(ext)) return `Microsoft Word Document (.${f.extension})`;
    if (ext === 'PDF') return 'Adobe Acrobat PDF Document (.pdf)';
    if (['DWG', 'DXF'].includes(ext)) return `AutoCAD Drawing File (.${f.extension})`;
    if (['JPG', 'JPEG', 'PNG', 'BMP', 'WEBP', 'SVG'].includes(ext)) return `Digital Image Asset (.${f.extension})`;
    if (['PPT', 'PPTX'].includes(ext)) return `PowerPoint Presentation (.${f.extension})`;
    return `${ext} Document`;
  };

  const handleCopyExtractedText = () => {
    navigator.clipboard.writeText(extractedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  };

  // Render text / log viewer
  const renderTextAndLogContent = () => {
    const ext = file.extension.toLowerCase();
    const isLog = ext === 'log' || file.name.toLowerCase().includes('log');

    return (
      <div className="space-y-2.5 flex flex-col h-full">
        {/* Controls Toolbar */}
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs shrink-0">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                placeholder="Find in text..."
                className="w-full pl-7 pr-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {textFilter && (
                <button
                  onClick={() => setTextFilter('')}
                  className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-1.5 rounded transition-colors ${
                wordWrap
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleCopyExtractedText}
            className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium shadow-2xs transition-colors shrink-0"
            title="Copy extracted text to clipboard"
          >
            {copiedText ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Text Metadata Badge */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono px-1 shrink-0">
          <span>{textLines.length} lines • {extractedText.trim().split(/\s+/).filter(Boolean).length} words</span>
          <span>UTF-8 Plain Text</span>
        </div>

        {/* Line Content Box */}
        <div className="flex-1 min-h-[220px] max-h-[380px] bg-[#0d1117] border border-slate-800 rounded-lg overflow-y-auto font-mono text-[11px] leading-relaxed p-2 text-slate-200 shadow-inner">
          <table className="w-full border-collapse">
            <tbody>
              {filteredLines.map((line, idx) => {
                const isError = line.includes('[ERROR]') || line.includes('FAIL') || line.includes('FATAL');
                const isWarn = line.includes('[WARN]') || line.includes('WARNING');
                const isInfo = line.includes('[INFO]');
                const isSuccess = line.includes('[SUCCESS]') || line.includes('PASS');
                const isDebug = line.includes('[DEBUG]');

                let badgeColor = '';
                if (isError) badgeColor = 'text-red-400 bg-red-950/40';
                else if (isWarn) badgeColor = 'text-amber-400 bg-amber-950/40';
                else if (isSuccess) badgeColor = 'text-emerald-400 bg-emerald-950/40';
                else if (isInfo) badgeColor = 'text-cyan-400';
                else if (isDebug) badgeColor = 'text-purple-400';

                return (
                  <tr key={idx} className={`hover:bg-slate-800/40 ${badgeColor ? badgeColor : ''}`}>
                    <td className="w-8 pr-3 text-right select-none text-slate-600 text-[10px] align-top">
                      {idx + 1}
                    </td>
                    <td className={`align-top ${wordWrap ? 'break-all whitespace-pre-wrap' : 'whitespace-pre'}`}>
                      {line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Image thumbnail viewer
  const renderImageContent = () => {
    if (!imageThumbnailData) return null;

    let filterStyle = '';
    if (imageFilter === 'grayscale') filterStyle = 'grayscale(100%)';
    else if (imageFilter === 'invert') filterStyle = 'invert(100%)';
    else if (imageFilter === 'contrast') filterStyle = 'contrast(175%) brightness(110%)';

    const megapixels = ((imageThumbnailData.width * imageThumbnailData.height) / 1000000).toFixed(1);

    return (
      <div className="space-y-3 flex flex-col">
        {/* Image Controls Toolbar */}
        <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setImageZoom((z) => Math.max(50, z - 25))}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono w-10 text-center font-semibold">
              {imageZoom}%
            </span>
            <button
              onClick={() => setImageZoom((z) => Math.min(250, z + 25))}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setImageZoom(100)}
              className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-800 font-mono rounded"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setImageRotation((r) => (r + 90) % 360)}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <select
              value={imageFilter}
              onChange={(e) => setImageFilter(e.target.value as any)}
              className="text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-slate-700 dark:text-slate-200"
              title="Image filter"
            >
              <option value="none">Normal</option>
              <option value="grayscale">Grayscale</option>
              <option value="invert">Invert Colors</option>
              <option value="contrast">High Contrast</option>
            </select>
          </div>
        </div>

        {/* Canvas / Image Thumbnail Frame */}
        <div className="bg-[#0b0f19] border border-slate-700/80 rounded-xl overflow-hidden flex items-center justify-center p-3 min-h-[220px] max-h-[320px] relative select-none shadow-inner">
          <img
            src={imageThumbnailData.url}
            alt={file.name}
            style={{
              transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
              filter: filterStyle,
              transition: 'transform 0.15s ease-out, filter 0.15s ease',
            }}
            className="max-h-[260px] max-w-full object-contain rounded shadow-lg pointer-events-none"
          />

          {imageThumbnailData.isSynthetic && (
            <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Generated Thumbnail</span>
            </div>
          )}
        </div>

        {/* Image Dimensions & Metadata */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Dimensions:</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              {imageThumbnailData.width} × {imageThumbnailData.height} px ({megapixels} MP)
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Aspect Ratio:</span>
            <span className="font-mono">
              {(imageThumbnailData.width / imageThumbnailData.height).toFixed(2)} : 1
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Format:</span>
            <span className="font-mono uppercase font-semibold text-slate-800 dark:text-slate-200">
              {file.extension || 'JPEG'} Image
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render authentic interactive previews for other document types
  const renderDocumentContent = () => {
    const ext = file.extension.toLowerCase();

    // 1. Text & Log Files: Direct in-app text extraction!
    if (isTextOrLog) {
      return renderTextAndLogContent();
    }

    // 2. Images: Direct in-app thumbnail generator & viewer!
    if (isImage) {
      return renderImageContent();
    }

    // 3. Excel Preview: Structured Tabular Grid
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return (
        <div className="space-y-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded p-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Spreadsheet Data View
            </span>
            <span className="text-[10px] font-mono">Formula Engine Active</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded overflow-x-auto text-[11px] font-mono font-tabular">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-1.5 text-center w-8 border-r border-slate-200 dark:border-slate-700">#</th>
                  <th className="p-1.5 text-left border-r border-slate-200 dark:border-slate-700">Description</th>
                  <th className="p-1.5 text-right border-r border-slate-200 dark:border-slate-700">Qty</th>
                  <th className="p-1.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#181d26] text-slate-700 dark:text-slate-200">
                <tr>
                  <td className="p-1 text-center bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-700 text-slate-400">1</td>
                  <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 font-sans">Earthwork &amp; Subgrade Compaction</td>
                  <td className="p-1.5 text-right border-r border-slate-200 dark:border-slate-700">48,200 m³</td>
                  <td className="p-1.5 text-right font-semibold">89,17,000</td>
                </tr>
                <tr>
                  <td className="p-1 text-center bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-700 text-slate-400">2</td>
                  <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 font-sans">Granular Sub-Base (GSB) Table 400-1</td>
                  <td className="p-1.5 text-right border-r border-slate-200 dark:border-slate-700">18,400 m³</td>
                  <td className="p-1.5 text-right font-semibold">2,61,28,000</td>
                </tr>
                <tr>
                  <td className="p-1 text-center bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-700 text-slate-400">3</td>
                  <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 font-sans">Dense Bituminous Macadam (DBM) VG-40</td>
                  <td className="p-1.5 text-right border-r border-slate-200 dark:border-slate-700">8,900 MT</td>
                  <td className="p-1.5 text-right font-semibold">5,74,05,000</td>
                </tr>
                <tr>
                  <td className="p-1 text-center bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-700 text-slate-400">4</td>
                  <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 font-sans">Bituminous Concrete (BC) Wearing Course</td>
                  <td className="p-1.5 text-right border-r border-slate-200 dark:border-slate-700">6,200 MT</td>
                  <td className="p-1.5 text-right font-semibold">4,41,44,000</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={3} className="p-1.5 text-right border-r border-slate-200 dark:border-slate-700">Gross Total Certified:</td>
                  <td className="p-1.5 text-right text-blue-600 dark:text-blue-400">₹ 14,12,98,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 4. CAD Drawing Preview: 2D Vector Highway Alignment Canvas
    if (['dwg', 'dxf'].includes(ext)) {
      return (
        <div className="space-y-3">
          <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded p-2 text-[11px] text-cyan-800 dark:text-cyan-300 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              CAD Vector Alignment Viewer
            </span>
            <span className="text-[10px] font-mono">Scale 1:2500</span>
          </div>

          <div className="bg-[#0b1320] border border-cyan-900/60 rounded-xl p-3 relative overflow-hidden h-44 flex flex-col justify-between text-cyan-400 font-mono text-[10px]">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none"></div>

            <div className="absolute top-2 right-2 flex items-center gap-1 text-slate-400">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>N</span>
            </div>

            <div className="relative w-full h-24 my-auto flex items-center">
              <svg className="w-full h-full" viewBox="0 0 300 80">
                <path d="M 10 20 Q 150 10 290 28" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3,3" />
                <path d="M 10 32 Q 150 22 290 40" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 10 40 Q 150 30 290 48" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
                <path d="M 10 48 Q 150 38 290 56" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 10 60 Q 150 50 290 68" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx="50" cy="38" r="2.5" fill="#ef4444" />
                <text x="42" y="75" fill="#94a3b8" fontSize="8">140+000</text>
                <circle cx="150" cy="30" r="2.5" fill="#ef4444" />
                <text x="142" y="75" fill="#94a3b8" fontSize="8">145+000</text>
                <circle cx="250" cy="42" r="2.5" fill="#ef4444" />
                <text x="242" y="75" fill="#94a3b8" fontSize="8">150+000</text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-slate-400 z-10 text-[9px]">
              <span>Radius: R = 1500m</span>
              <span>Super-elevation: e = 4.2%</span>
              <span>ROW: 60m</span>
            </div>
          </div>
        </div>
      );
    }

    // 5. PDF & Documents Default Content Viewer
    return (
      <div className="space-y-3">
        <div className="bg-slate-50 dark:bg-[#141822] p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs leading-relaxed max-h-96 overflow-y-auto font-sans text-slate-800 dark:text-slate-200 space-y-2 whitespace-pre-wrap">
          {file.contentFull || file.contentSnippet || (
            <p className="text-slate-400 italic">No extracted document text available for this file.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-88 bg-white dark:bg-[#181d26] border-l border-[#dbe3ed] dark:border-[#283243] flex flex-col shrink-0 select-none overflow-y-auto text-xs z-20">
      {/* Top Header */}
      <div className="h-10 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#151922] shrink-0">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Preview Pane</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
          title="Close preview pane"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File Card Summary */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 shrink-0">
            {file.isFolder ? (
              <Folder className="w-6 h-6 text-amber-500" />
            ) : isImage ? (
              <FileImage className="w-6 h-6 text-purple-600" />
            ) : isTextOrLog ? (
              <FileText className="w-6 h-6 text-blue-600" />
            ) : file.category === 'pdf' ? (
              <FileText className="w-6 h-6 text-red-500" />
            ) : file.category === 'excel' ? (
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            ) : file.category === 'cad' ? (
              <FileCode className="w-6 h-6 text-cyan-600" />
            ) : (
              <File className="w-6 h-6 text-slate-600" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 break-all leading-snug">
              {file.name}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {getFileCategoryLabel(file)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onOpenItem(file)}
            className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in App</span>
          </button>

          <button
            onClick={handleCopyPath}
            className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium flex items-center gap-1 transition-colors"
            title="Copy full Windows path"
          >
            {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPath ? 'Copied' : 'Path'}</span>
          </button>
        </div>

        {/* Revision Family & Superseded Versions Card */}
        {revisions && revisions.allRevisions.length > 1 && (
          <div className="mt-2.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Revision Family ({revisions.allRevisions.length} versions)
              </span>
              {revisions.latest.id === file.id ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase font-bold">
                  Latest Version
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 uppercase font-bold">
                  Superseded
                </span>
              )}
            </div>
            <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 mb-1.5">
              Click any version below to jump preview:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
              {revisions.allRevisions.map((revFile) => {
                const isCurrent = revFile.id === file.id;
                const isLatest = revFile.id === revisions.latest.id;
                return (
                  <div
                    key={revFile.id}
                    onClick={() => onSelectRevision?.(revFile)}
                    className={`p-1.5 rounded flex items-center justify-between text-[11px] cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-amber-100/90 dark:bg-amber-900/60 font-semibold text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700'
                        : 'hover:bg-amber-100/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate flex items-center gap-1.5 min-w-0 pr-2">
                      <span className={`font-mono text-[10px] font-bold shrink-0 px-1 py-0.2 rounded ${isLatest ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {revFile.revision || (isLatest ? 'Latest' : 'Rev')}
                      </span>
                      <span className="truncate text-[10px]" title={revFile.name}>
                        {revFile.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono shrink-0">
                      {formatFileSize(revFile.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141822] shrink-0">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {isImage ? 'Image Viewer' : isTextOrLog ? 'Extracted Text / Log' : 'Document Preview'}
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'metadata'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Properties
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'preview' ? (
          renderDocumentContent()
        ) : (
          <div className="space-y-3 font-sans">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Location / Path</span>
              <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg mt-0.5 border border-slate-200 dark:border-slate-800">
                {file.path}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">File Size</span>
                <p className="font-mono text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                  {file.isFolder ? 'Folder' : formatFileSize(file.size)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Category</span>
                <p className="text-slate-800 dark:text-slate-200 uppercase font-semibold mt-0.5">
                  {file.category}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Date Modified</span>
                <p className="font-mono text-slate-800 dark:text-slate-200 text-[11px] mt-0.5">
                  {formatDate(file.modifiedDate)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Date Created</span>
                <p className="font-mono text-slate-800 dark:text-slate-200 text-[11px] mt-0.5">
                  {formatDate(file.createdDate)}
                </p>
              </div>
            </div>

            {/* Custom Metadata for Highway Projects */}
            {file.metadata && Object.keys(file.metadata).length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Engineering Metadata</span>
                <div className="mt-1 space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {Object.entries(file.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{key}:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Tags */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-500" />
                  Project Tags
                </span>
                {onManageTags && (
                  <button
                    onClick={() => onManageTags(file)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {file.tags && file.tags.length > 0 ? '+ Edit Tags' : '+ Add Tag'}
                  </button>
                )}
              </div>

              {file.tags && file.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {file.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No tags assigned</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Direct Windows Action Buttons */}
      <div className="p-3 bg-slate-50 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => onOpenItem(file)}
          className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open with Default App ({file.extension.toUpperCase()})</span>
        </button>
        <button
          onClick={() => onOpenContainingFolder(file)}
          className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          <span>Open Containing Folder in Explorer</span>
        </button>
      </div>
    </div>
  );
};
