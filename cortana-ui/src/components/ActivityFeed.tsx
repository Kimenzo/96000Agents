import React from 'react';
import { useStore } from '../store/store';

export function ActivityFeed() {
  const logs = useStore(s => s.logs);

  return (
    <div style={{
      position: 'absolute', bottom: 32, left: 'max(2.5%, calc(50% - 700px))', 
      width: 380, height: 450,
      display: 'flex', flexDirection: 'column', zIndex: 10,
      // Fades out logs smoothly at the top
      maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)'
    }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', gap: 6 }}>
        {logs.map((log) => {
          const isError = log.type === 'error';
          const isWarn = log.type === 'warn';
          
          return (
            <div key={log.id} style={{
              padding: '12px 14px',
              background: 'var(--glass)',
              borderLeft: `2px solid ${isError ? 'var(--danger)' : isWarn ? '#fbbf24' : 'var(--glass-border)'}`,
              borderRadius: '0 8px 8px 0',
              fontFamily: 'JetBrains Mono, monospace',
              animation: 'slideUpEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              opacity: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                  NODE // {log.id.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                  {new Date(log.time).toISOString().split('T')[1].replace('Z', '')}
                </span>
              </div>
              <div style={{ 
                color: isError ? 'var(--danger)' : '#e5e5e5',
                fontSize: 12, lineHeight: 1.4 
              }}>
                {log.msg}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideUpEntry {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}