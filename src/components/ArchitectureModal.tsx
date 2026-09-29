import React from 'react';
import { X, Cpu, CheckCircle2, Shield, Zap, Database, Terminal, FileCode2 } from 'lucide-react';

interface ArchitectureModalProps {
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a202c] border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-[#141822] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-blue-600 text-white">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Native Windows Architecture &amp; Technology Stack Blueprint
              </h3>
              <p className="text-[11px] text-slate-500">
                Engineering Specification (Section 30: Language, Framework, Local DB, FTS, Watchers)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Core Priority: Speed → Simplicity → Search → Offline Reliability
            </h4>
            <p className="mt-1 text-[11px] text-blue-800 dark:text-blue-300">
              For highway project teams dealing with 100,000 to 1,000,000+ files (DPR, MPR, IPC, RA Bills, BOQ, DWG, PDF), the backend indexing pipeline must consume less than 80 MB RAM, execute searches in under 5 milliseconds, and monitor NTFS drives without scanning hard drives repeatedly.
            </p>
          </div>

          {/* Grid of Choices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Language & Runtime */}
            <div className="p-3 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-[#151922] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>1. Selected Language: C# (.NET 8 LTS) / Rust</span>
              </div>
              <p className="text-[11px]">
                <strong>Reason:</strong> Native Windows interoperability via Win32 P/Invoke, zero garbage-collection stutter in background threads with AOT (Ahead-of-Time compilation), high-speed memory-mapped file access, and SIMD string vectorization.
              </p>
            </div>

            {/* 2. Desktop Framework */}
            <div className="p-3 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-[#151922] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>2. Framework: WinUI 3 (Windows App SDK) / Tauri v2</span>
              </div>
              <p className="text-[11px]">
                <strong>Reason:</strong> Native Windows 11 Mica/Acrylic styling, hardware-accelerated DirectComposition, virtualized list controls handling 500,000+ rows seamlessly, and low RAM footprint (&lt;60MB compared to Electron's 400MB+).
              </p>
            </div>

            {/* 3. Local Database & FTS */}
            <div className="p-3 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-[#151922] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <Database className="w-4 h-4 text-blue-600" />
                <span>3. Local DB &amp; Search: SQLite FTS5 (BM25)</span>
              </div>
              <p className="text-[11px]">
                <strong>Reason:</strong> Zero-configuration, zero-server embedded single-file storage. SQLite FTS5 extension provides full-text inverted indexing, prefix token matching (e.g. <code>IPC*</code>, <code>MoRTH*</code>), BM25 ranking, and sub-3ms query speeds.
              </p>
            </div>

            {/* 4. File System Watcher */}
            <div className="p-3 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-[#151922] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <Terminal className="w-4 h-4 text-purple-600" />
                <span>4. Watcher: Windows USN Journal + ReadDirectoryChangesW</span>
              </div>
              <p className="text-[11px]">
                <strong>Reason:</strong> Directly reads the NTFS Master File Table (MFT) and Update Sequence Number (USN) Change Journal. Never crawls disk twice. Captures creations, renames, and deletions with zero CPU overhead.
              </p>
            </div>

            {/* 5. Document Extraction Libraries */}
            <div className="p-3 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-slate-50/50 dark:bg-[#151922] space-y-1.5 col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <FileCode2 className="w-4 h-4 text-amber-600" />
                <span>5. File Extraction Libraries (Offline &amp; Streaming)</span>
              </div>
              <ul className="text-[11px] list-disc pl-5 space-y-0.5">
                <li><strong>PDF:</strong> <code>PdfPig</code> / <code>pdf-extract</code> - High-speed text extraction without rendering pixels.</li>
                <li><strong>Excel &amp; Word:</strong> <code>DocumentFormat.OpenXml</code> + <code>ExcelDataReader</code> - Streaming reader for .xlsx, .docx, .csv without requiring MS Office installed.</li>
                <li><strong>CAD (.dwg / .dxf):</strong> <code>netDxf</code> / <code>libredwg</code> - Extracts layer names, block text, MText annotations, and coordinate extents.</li>
                <li><strong>Safe Limits:</strong> Bounded 50KB text sample per document to prevent memory bloating while capturing critical letters &amp; specs.</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-slate-100 dark:bg-[#151922] rounded border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Production Deployment Package (Phase 10):</span>
            <p>Single lightweight MSIX / Inno Setup installer (~18 MB), zero dependencies, works on clean Windows 10 &amp; Windows 11 offline machines.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-[#141822] border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
