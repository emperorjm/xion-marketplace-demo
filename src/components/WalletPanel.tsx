import React from 'react';
import { Abstraxion, useModal } from '@burnt-labs/abstraxion';
import { useCosmos } from '../hooks/useCosmos';

export const WalletPanel: React.FC = () => {
  const { address, isConnected, connectAbstraxion, disconnect, loading, error } = useCosmos();
  const [, setShowAbstraxion] = useModal();

  const handleAbstraxion = () => {
    connectAbstraxion();
    setShowAbstraxion(true);
  };

  return (
    <div className="wallet-panel">
      <h3>Wallet</h3>
      <p className="helper-text">
        Connect with Abstraxion for social login with gasless transactions.
      </p>
      <p>
        <strong>Status:</strong> {isConnected ? 'Connected via Abstraxion' : 'Disconnected'}
      </p>
      {address && <p><strong>Address:</strong> {address}</p>}
      {error && <p className="helper-text" style={{ color: '#b91c1c' }}>{error}</p>}

      {!isConnected ? (
        <div className="wallet-actions">
          <button className="primary" type="button" onClick={handleAbstraxion} disabled={loading}>
            Connect with Abstraxion
          </button>
        </div>
      ) : (
        <div className="wallet-actions">
          <button className="secondary" type="button" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}

      <Abstraxion onClose={() => setShowAbstraxion(false)} />
    </div>
  );
};
