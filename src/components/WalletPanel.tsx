import React from 'react';
import { useCosmos } from '../hooks/useCosmos';

export const WalletPanel: React.FC = () => {
  const { address, isConnected, connectKeplr, disconnect, loading, error } = useCosmos();

  const handleKeplr = async () => {
    try {
      await connectKeplr();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="wallet-panel">
      <h3>Wallet</h3>
      <p className="helper-text">
        Connect with Keplr wallet extension to interact with contracts.
      </p>
      <p><strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
      {address && <p><strong>Address:</strong> {address}</p>}
      {error && <p className="helper-text" style={{ color: '#b91c1c' }}>{error}</p>}
      <div className="wallet-actions">
        <button className="primary" type="button" onClick={handleKeplr} disabled={loading}>
          Connect Keplr
        </button>
        <button className="secondary" type="button" onClick={disconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>
    </div>
  );
};
