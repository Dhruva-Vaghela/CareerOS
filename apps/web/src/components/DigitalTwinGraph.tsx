import React, { useEffect, useState } from 'react';
import { Dna, ShieldCheck, Database, Sparkles, CheckCircle2, HelpCircle, Cpu, Radio, Network } from 'lucide-react';

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
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const fetchDigitalTwin = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/v1/digital-twin', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (res.ok) {
        const data = await res.json();
        setTwinStatus(data.twin?.status || 'ACTIVE');
        const fetchedNodes = data.nodes || [];
        setNodes(fetchedNodes);
        if (fetchedNodes.length > 0) {
          setActiveNodeId(fetchedNodes[0].id);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching digital twin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDigitalTwin(controller.signal);
    return () => controller.abort();
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
        return <span className="tech-badge tech-badge-emerald"><CheckCircle2 size={12} /> Verified</span>;
      case 'IMPORTED':
        return <span className="tech-badge tech-badge-cyan"><Database size={12} /> Imported</span>;
      default:
        return <span className="tech-badge tech-badge-amber"><HelpCircle size={12} /> Self-Declared</span>;
    }
  };

  const getConfidenceTag = (score: string) => {
    switch (score) {
      case 'HIGH':
        return <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>HIGH CONFIDENCE</span>;
      case 'MEDIUM':
        return <span style={{ color: '#0891b2', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>MEDIUM CONFIDENCE</span>;
      default:
        return <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>LOW CONFIDENCE</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="cockpit-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Cpu className="spinner" size={24} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
        <div>Connecting to Digital Twin Evidence Graph...</div>
      </div>
    );
  }

  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-reveal">
      {/* Telemetry Header */}
      <div
        className="cockpit-panel"
        style={{
          padding: '1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(124, 58, 237, 0.03) 100%)',
          borderLeft: '4px solid var(--color-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--gradient-hero)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow-indigo)',
            }}
            className="animate-float"
          >
            <Dna size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Career Digital Twin Telemetry
              </h2>
              <span className="glow-pill-cockpit" style={{ fontSize: '0.65rem' }}>
                <ShieldCheck size={11} /> {twinStatus}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              Autonomous evidence graph storing <strong style={{ color: '#4f46e5' }}>{nodes.length} verified context nodes</strong> for AI interview reasoning.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', fontWeight: 600 }}>
              Nodes Compiled
            </span>
            <strong style={{ fontSize: '1.5rem', color: '#4f46e5', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {nodes.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Interactive Spatial Node Graph & Inspector */}
      <div className="cockpit-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <Network size={18} color="#4f46e5" /> Digital Twin Knowledge Graph Visualization
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Select node to inspect evidence payload
          </span>
        </div>

        {/* Spatial Graph Interactive Canvas */}
        <div
          style={{
            position: 'relative',
            height: '320px',
            background: '#ffffff',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 30px rgba(79, 70, 229, 0.03)',
          }}
        >
          {/* Background Grid Pattern & Radial Scanner */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Central Node Rings */}
            <circle cx="50%" cy="50%" r="90" fill="none" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="50%" cy="50%" r="130" fill="none" stroke="rgba(8, 145, 178, 0.12)" strokeWidth="1" />

            {/* Connecting Lines to Nodes */}
            {nodes.map((node, idx) => {
              const total = Math.max(nodes.length, 1);
              const angle = (idx * (2 * Math.PI)) / total;
              const radius = 110;
              const targetX = 50 + (radius / 3.5) * Math.cos(angle);
              const targetY = 50 + (radius / 2.2) * Math.sin(angle);
              const isSelected = activeNodeId === node.id;

              return (
                <line
                  key={`line-${node.id}`}
                  x1="50%"
                  y1="50%"
                  x2={`${targetX}%`}
                  y2={`${targetY}%`}
                  stroke={isSelected ? '#4f46e5' : 'rgba(148, 163, 184, 0.6)'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? '6 3' : 'none'}
                  style={{ transition: 'all 0.3s ease' }}
                />
              );
            })}
          </svg>

          {/* Central AI Node */}
          <div
            style={{
              position: 'absolute',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--gradient-hero)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow-indigo)',
              zIndex: 10,
              cursor: 'pointer',
            }}
            className="animate-pulse-glow"
          >
            <Radio size={22} />
            <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI HUB</span>
          </div>

          {/* Peripheral Twin Nodes */}
          {nodes.map((node, idx) => {
            const total = Math.max(nodes.length, 1);
            const angle = (idx * (2 * Math.PI)) / total;
            const radius = 110;
            const targetX = 50 + (radius / 3.5) * Math.cos(angle);
            const targetY = 50 + (radius / 2.2) * Math.sin(angle);
            const isSelected = activeNodeId === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                style={{
                  position: 'absolute',
                  left: `${targetX}%`,
                  top: `${targetY}%`,
                  transform: isSelected ? 'translate(-50%, -50%) scale(1.1)' : 'translate(-50%, -50%) scale(1)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--border-radius-sm)',
                  background: isSelected ? 'rgba(79, 70, 229, 0.1)' : '#ffffff',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                  color: isSelected ? '#4f46e5' : '#1e293b',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-glow-indigo)' : '0 2px 8px rgba(15,23,42,0.06)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  zIndex: 20,
                  whiteSpace: 'nowrap',
                }}
              >
                {node.nodeType}
              </div>
            );
          })}
        </div>

        {/* Selected Node Details Inspector */}
        {activeNode && (
          <div
            className="animate-scale-in"
            style={{
              padding: '1.15rem',
              background: '#f8fafc',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#4f46e5', fontFamily: 'var(--font-mono)' }}>
                  [{activeNode.nodeType}]
                </span>
                {getVerificationBadge(activeNode.verificationStatus)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  Source: {activeNode.source}
                </span>
                {getConfidenceTag(activeNode.confidenceScore)}
              </div>
            </div>

            {/* Metadata Payload Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.65rem',
                background: '#ffffff',
                padding: '0.85rem',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              {Object.entries(activeNode.metadata || {}).map(([key, val]) => (
                <div key={key} style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize', display: 'block', fontSize: '0.7rem' }}>
                    {key}:
                  </span>
                  <strong style={{ color: '#0f172a', wordBreak: 'break-word' }}>
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Context Builder Visualizer Console */}
      <div className="cockpit-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <Sparkles size={18} color="#7c3aed" /> AI Scoped Context Compiler Visualizer
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Select feature scope to inspect real API context prompt payloads
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
          <div style={{ color: '#4f46e5', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--border-radius-sm)', border: '1px solid #e2e8f0' }}>
            <Cpu className="spinner" size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Compiling scoped twin node graph for target context feature: [{selectedFeature}]...
          </div>
        ) : contextResult ? (
          <div
            className="animate-scale-in"
            style={{
              background: '#0f172a',
              borderRadius: 'var(--border-radius-md)',
              padding: '1.15rem',
              border: '1px solid #1e293b',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: '#f8fafc',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.4rem' }}>
              // TELEMETRY OUTPUT • Feature Target: {contextResult.feature} • Scoped Nodes: {contextResult.nodeCount}
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#cbd5e1' }}>
              {JSON.stringify(contextResult.nodes, null, 2)}
            </pre>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Select an AI feature target above to inspect the exact scoped Digital Twin nodes passed into prompt models.
          </p>
        )}
      </div>
    </div>
  );
};
