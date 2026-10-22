import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, ExternalLink, Download, FileText, AlertCircle } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  filename: string;
  accessToken?: string | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  filename,
  accessToken,
}) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isOpen || !pdfUrl) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setLoadError('');

    const load = async () => {
      if (pdfUrl.startsWith('/api/v1/resume/file/')) {
        if (!accessToken) {
          setLoadError('Sign in again to view this resume.');
          return;
        }
        try {
          const response = await fetch(pdfUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Resume file could not be loaded.');
          objectUrl = URL.createObjectURL(await response.blob());
          setDisplayUrl(objectUrl);
        } catch (error) {
          if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Resume file could not be loaded.');
        }
      } else {
        setDisplayUrl(pdfUrl);
      }
    };

    setDisplayUrl(null);
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, pdfUrl, accessToken]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="cockpit-panel animate-scale-in"
        style={{
          width: '95%',
          maxWidth: '960px',
          height: '85vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          boxShadow: 'var(--shadow-light-lg)',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
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
              href={displayUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <ExternalLink size={14} style={{ marginRight: '0.35rem' }} /> Open in New Tab
            </a>

            <a
              href={displayUrl || undefined}
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
          {displayUrl ? (
            <object
              data={`${displayUrl}#toolbar=1`}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
            >
              <iframe
                src={`${displayUrl}#toolbar=1`}
                title="PDF Resume Preview"
                width="100%"
                height="100%"
                style={{ border: 'none', width: '100%', height: '100%', background: '#ffffff' }}
              />
            </object>
          ) : loadError ? (
            <div role="alert" style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>{loadError}</div>
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
              <p>Loading resume…</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

