import React from 'react';
import { X, ExternalLink, Download, FileText, AlertCircle } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  filename: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  filename,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="cockpit-panel animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          boxShadow: 'var(--shadow-light-lg)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {filename || 'Resume Document'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PDF Document Viewer</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <ExternalLink size={14} style={{ marginRight: '0.35rem' }} /> Open in New Tab
            </a>

            <a
              href={pdfUrl}
              download={filename}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <Download size={14} style={{ marginRight: '0.35rem' }} /> Download
            </a>

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Embedded Native Browser PDF Viewer */}
        <div style={{ flex: 1, position: 'relative', background: '#f1f5f9' }}>
          {pdfUrl ? (
            <object
              data={`${pdfUrl}#toolbar=1`}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
            >
              <iframe
                src={`${pdfUrl}#toolbar=1`}
                title="PDF Resume Preview"
                width="100%"
                height="100%"
                style={{ border: 'none', width: '100%', height: '100%', background: '#ffffff' }}
              />
            </object>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '1rem',
                color: '#64748b',
              }}
            >
              <AlertCircle size={40} color="#ef4444" />
              <p>No valid PDF document URL found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
