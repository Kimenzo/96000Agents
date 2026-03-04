import React from 'react';
import { useStore } from '../store/store';

export function Header() {
  const mode = useStore(s => s.mode);
  const setMode = useStore(s => s.setMode);
  const metrics = useStore(s => s.metrics);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%',
        maxWidth: '1400px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Elegant omniscient icon */}
          <div style={{ position: 'relative', width: 14, height: 14 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'var(--accent)',
                opacity: 0.2,
                animation: 'pulse 2s infinite',
              }}
            />
            <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'var(--accent)' }} />
          </div>
          <span style={{ fontWeight: 500, letterSpacing: '0.08em', fontSize: 13, color: '#fff' }}>AETHER NEXUS</span>
        </div>

        <div style={{ height: 24, width: 1, background: 'var(--glass-border)' }} />

        <div style={{ display: 'flex', gap: 32, fontSize: 13, letterSpacing: '0.04em' }}>
          <span style={{ color: 'var(--text-dim)' }}>
            AGENTS{' '}
            <strong style={{ color: '#fff', marginLeft: 4, fontWeight: 500 }}>{metrics.active.toLocaleString()}</strong>
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            QPS{' '}
            <strong style={{ color: '#fff', marginLeft: 4, fontWeight: 500 }}>
              {(metrics.processing / 1000).toFixed(1)}k
            </strong>
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            ANOMALIES{' '}
            <strong
              style={{ color: metrics.violations > 0 ? 'var(--danger)' : '#fff', marginLeft: 4, fontWeight: 500 }}
            >
              {metrics.violations}
            </strong>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.4)',
          padding: 4,
          borderRadius: 8,
          border: '1px solid var(--glass-border)',
        }}
      >
        <button
          onClick={() => setMode('SWARM')}
          style={{
            padding: '6px 20px',
            borderRadius: 6,
            border: 'none',
            background: mode === 'SWARM' ? 'var(--glass)' : 'transparent',
            color: mode === 'SWARM' ? '#fff' : 'var(--text-dim)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
          }}
        >
          NEURAL SWARM
        </button>
        <button
          onClick={() => setMode('MATRIX')}
          style={{
            padding: '6px 20px',
            borderRadius: 6,
            border: 'none',
            background: mode === 'MATRIX' ? 'var(--glass)' : 'transparent',
            color: mode === 'MATRIX' ? '#fff' : 'var(--text-dim)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
          }}
        >
          CYCLIC MATRIX
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
