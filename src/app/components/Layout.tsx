import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Abstraxion, useModal } from '@burnt-labs/abstraxion';
import { useRole } from '../hooks/useLocalStore';
import { useCosmos } from '../../hooks/useCosmos';
import { UserRole } from '../store/localStore';
import '../styles/app.css';

export function Layout() {
  const { role, setRole } = useRole();
  const { isConnected, address, disconnect } = useCosmos();
  const [, setShowModal] = useModal();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
  };

  return (
    <div className="app-dark app-layout">
      <nav className="app-navbar">
        <Link to="/" className="app-navbar-brand">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#22c55e" />
            <path d="M10 16L14 20L22 12" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          XION Marketplace
        </Link>

        <div className="app-navbar-nav">
          <NavLink to="/" end className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            Explore
          </NavLink>
          <NavLink to="/my-items" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            My Items
          </NavLink>
          {(role === 'seller' || role === 'admin') && (
            <>
              <NavLink to="/create" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                Create
              </NavLink>
              <NavLink to="/listings" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                Listings
              </NavLink>
            </>
          )}
          {role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              Admin
            </NavLink>
          )}
          <NavLink to="/activity" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            Activity
          </NavLink>
        </div>

        <div className="app-navbar-actions">
          <div className="role-selector">
            <span className={`role-badge ${role}`}>{role}</span>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {isConnected ? (
            <div className="wallet-info">
              <div className="wallet-address" onClick={copyAddress} title="Click to copy address">
                <span style={{ color: '#22c55e' }}>●</span>
                {copied ? 'Copied!' : truncateAddress(address || '')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={disconnect} title="Disconnect wallet">
                ✕
              </button>
            </div>
          ) : (
            <button className="wallet-button" onClick={() => setShowModal(true)}>
              Connect Wallet
            </button>
          )}

          <Link to="/console" className="btn btn-ghost btn-sm">
            Console
          </Link>
        </div>
      </nav>

      <main className="app-main">
        <Outlet />
      </main>

      <Abstraxion onClose={() => setShowModal(false)} />
    </div>
  );
}
