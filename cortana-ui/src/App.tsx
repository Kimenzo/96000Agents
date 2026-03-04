import React, { useEffect } from 'react';
import { DataNexus } from './components/DataNexus';
import { Header } from './components/Header';
import { ActivityFeed } from './components/ActivityFeed';
import { startSimulator } from './mocks/simulator';

export default function App() {
  useEffect(() => {
    const cleanup = startSimulator();
    return cleanup;
  }, []);

  return (
    <div className="app-shell">
      <DataNexus />
      <Header />
      <ActivityFeed />
    </div>
  );
}