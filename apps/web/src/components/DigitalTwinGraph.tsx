import React, { useEffect, useState } from 'react';
import { Dna, ShieldCheck, Database, Layers, Sparkles, CheckCircle2, HelpCircle } from 'lucide-react';

interface TwinNode {
  id: string;
  nodeType: string;
  source: string;
  verificationStatus: string;
  confidenceScore: string;
  metadata: Record<string, any>;
  createdAt?: string;
}

interface DigitalTwinGraphProps {
  accessToken: string | null;
}

export const DigitalTwinGraph: React.FC<DigitalTwinGraphProps> = ({ accessToken }) => {
  const [nodes, setNodes] = useState<TwinNode[]>([]);
  const [twinStatus, setTwinStatus] = useState<string>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string>('Roadmap');
  const [contextResult, setContextResult] = useState<any | null>(null);
  const [isBuildingContext, setIsBuildingContext] = useState(false);

  const fetchDigitalTwin = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/v1/digital-twin', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTwinStatus(data.twin?.status || 'ACTIVE');
        setNodes(data.nodes || []);
      }
    } catch (err) {
      console.error('Error fetching digital twin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDigitalTwin();
  }, [accessToken]);

  const handleBuildContext = async (feature: string) => {
    setSelectedFeature(feature);
    setIsBuildingContext(true);
    try {
      const res = await fetch('/api/v1/digital-twin/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetFeature: feature }),
      });
      if (res.ok) {
        const data = await res.json();
        setContextResult(data.context);
      }
    } catch (err) {
      console.error('Error building context:', err);
    } finally {
      setIsBuildingContext(false);
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Verified
          </span>
        );
      case 'IMPORTED':
        return (
          <span style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2', border: '1px solid rgba(8, 145, 178, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <Database size={12} /> Imported
          </span>
        );
      default:
        return (
          <span style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <HelpCircle size={12} /> Self-Declared
          </span>
        );
    }
  };

  const getConfidenceTag = (score: string) => {
    switch (score) {
      case 'HIGH':
        return <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.75rem' }}>High Confidence</span>;
      case 'MEDIUM':
        return <span style={{ color: '#0891b2', fontWeight: 700, fontSize: '0.75rem' }}>Medium Confidence</span>;
      default:
        return <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.75rem' }}>Low Confidence</span>;
    }
  };

  if (isLoading) {
    return <div style={{ padding: '1.5rem', color: '#64748b' }}>Loading Digital Twin...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 3D Header Banner in Light Mode */}
      <div
        className="card-3d"
        style={{
          padding: '1.75rem',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(124, 58, 237, 0.04) 100%)',
          borderColor: 'rgba(79, 70, 229, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'var(--gradient-3d-hero)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-glow)',
            }}
            className="animate-float"
          >
            <Dna size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Career Digital Twin</h2>
              <span className="glow-pill-3d" style={{ fontSize: '0.7rem' }}>
                <ShieldCheck size={12} /> {twinStatus}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Independent AI evidence graph storing {nodes.length} verified context nodes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Active Nodes</span>
            <strong style={{ fontSize: '1.5rem', color: '#4f46e5', fontWeight: 800 }}>{nodes.length}</strong>
          </div>
        </div>
      </div>

      {/* Nodes 3D Grid */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
          <Layers size={18} color="#0891b2" /> Aggregated Context Nodes ({nodes.length})
        </h3>

        {nodes.length === 0 ? (
          <div className="card-3d" style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#ffffff' }}>
            No Digital Twin nodes created yet. Complete onboarding or add career goals to generate nodes.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {nodes.map((node) => (
              <div
                key={node.id}
                className="card-3d"
                style={{
                  padding: '1.25rem',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#4f46e5', letterSpacing: '0.05em' }}>
                    {node.nodeType}
                  </span>
                  {getVerificationBadge(node.verificationStatus)}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#1e293b', background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {Object.entries(node.metadata || {}).slice(0, 3).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{key}:</span>
                      <strong style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                  <span style={{ color: '#94a3b8' }}>Source: {node.source}</span>
                  {getConfidenceTag(node.confidenceScore)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Context Builder Interactive Panel */}
      <div
        className="card-3d"
        style={{
          padding: '1.5rem',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <Sparkles size={18} color="#7c3aed" /> AI Context Builder Visualizer
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Selective context gathering per feature
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['Roadmap', 'Interview', 'Skills', 'Assessment', 'Recommendation'].map((feature) => (
            <button
              key={feature}
              onClick={() => handleBuildContext(feature)}
              className={`btn ${selectedFeature === feature ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', width: 'auto' }}
            >
              {feature} Context
            </button>
          ))}
        </div>

        {isBuildingContext ? (
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Gathering scoped twin nodes for {selectedFeature}...</div>
        ) : contextResult ? (
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: '#0f172a',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            <div style={{ color: '#7c3aed', fontWeight: 700, marginBottom: '0.5rem' }}>
              // Feature: {contextResult.feature} • Nodes Retrieved: {contextResult.nodeCount}
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#334155' }}>
              {JSON.stringify(contextResult.nodes, null, 2)}
            </pre>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            Select an AI feature above to view the exact scoped Digital Twin nodes passed to AI prompt models.
          </p>
        )}
      </div>
    </div>
  );
};
