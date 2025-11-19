import React from 'react';
import { LogEntry } from '../lib/types';

interface Props {
  entries: LogEntry[];
}

export const ExecutionLog: React.FC<Props> = ({ entries }) => (
  <div className="log-panel">
    {entries.length === 0 && <p>No actions yet.</p>}
    {entries.map((entry) => (
      <div key={entry.id} className="log-entry">
        <div>
          <strong>{entry.title}</strong> [{entry.status}] — {entry.timestamp}
        </div>
        <div>{entry.detail}</div>
        {entry.txHash && <div>txHash: {entry.txHash}</div>}
      </div>
    ))}
  </div>
);
