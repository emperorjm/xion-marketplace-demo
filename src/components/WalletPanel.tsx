import React from 'react';
import { useCosmos } from '../hooks/useCosmos';

export const WalletPanel: React.FC = () => {
  const { address, isConnected, connectKeplr, connectMnemonic, disconnect, loading, error } = useCosmos();

  const handleMnemonicConnect = async () => {
    try {
      await connectMnemonic();
    } catch (err) {
      console.error(err);
    }
  };

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
        Connect with Keplr or supply a testing mnemonic (never use production secrets here).
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
      <button className="primary" type="button" style={{ marginTop: '0.75rem' }} onClick={handleMnemonicConnect} disabled={loading}>
        Connect via Default Mnemonic
      </button>
    </div>
  );
};
