'use client';
import { useState } from 'react';
import Sessions from '../components/Sessions';
import Heatmap from '../components/Heatmap';

export default function Home() {
  const [tab, setTab] = useState('sessions');
  return (
    <main>
      <header className="top">
        <h1>Behavior analytics</h1>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'sessions'} onClick={() => setTab('sessions')}>Sessions</button>
          <button role="tab" aria-selected={tab === 'heatmap'} onClick={() => setTab('heatmap')}>Heatmap</button>
        </div>
      </header>
      {tab === 'sessions' ? <Sessions /> : <Heatmap />}
    </main>
  );
}
