import React, { useState } from 'react';
import { Abstraxion, useModal } from '@burnt-labs/abstraxion';
import { useCosmos } from '../hooks/useCosmos';

export const WalletPanel: React.FC = () => {
  const { address, isConnected, connectKeplr, connectAbstraxion, disconnect, loading, error, walletType } = useCosmos();
  const [, setShowAbstraxion] = useModal();
  const [showKeplrOption, setShowKeplrOption] = useState(false);

  const handleAbstraxion = () => {
    connectAbstraxion();
    setShowAbstraxion(true);
  };

  const handleKeplr = async () => {
    try {
      await connectKeplr();
    } catch (err) {
      console.error(err);
    }
  };

  const walletLabel = walletType === 'abstraxion' ? 'Abstraxion' : walletType === 'keplr' ? 'Keplr' : null;

  return (
    <div className="wallet-panel">
      <h3>Wallet</h3>
      <p className="helper-text">
        Connect with Abstraxion (recommended) for social login or Keplr for browser extension wallet.
      </p>
      <p>
        <strong>Status:</strong> {isConnected ? `Connected via ${walletLabel}` : 'Disconnected'}
      </p>
      {address && <p><strong>Address:</strong> {address}</p>}
      {error && <p className="helper-text" style={{ color: '#b91c1c' }}>{error}</p>}

      {!isConnected ? (
        <div className="wallet-actions">
          <button className="primary" type="button" onClick={handleAbstraxion} disabled={loading}>
            Connect with Abstraxion
          </button>
          {!showKeplrOption ? (
            <button
              className="secondary"
              type="button"
              onClick={() => setShowKeplrOption(true)}
              style={{ fontSize: '0.85em' }}
            >
              Use Keplr instead
            </button>
          ) : (
            <button className="secondary" type="button" onClick={handleKeplr} disabled={loading}>
              Connect Keplr
            </button>
          )}
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
