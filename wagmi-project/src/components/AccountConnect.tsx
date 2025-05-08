import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

interface AccountConnectProps {
  // Props will be derived from the hooks directly within this component
  // No need to pass them down from App/page.tsx if this component uses the hooks itself.
}

export function AccountConnect(props: AccountConnectProps) {
  const account = useAccount();
  const { connectors, connect, status, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div 
      className="card" // Use .card class from globals.css
      style={{ marginBottom: '20px' }} // Keep specific margin
    >
      <h2 style={{ 
        marginBottom: '10px', 
        borderBottom: '1px solid var(--border-color-dark)', 
        paddingBottom: '5px',
        color: 'var(--primary-color)', 
        fontSize: '1.5em'
      }}>
        👤 Account
      </h2>
      {account.status === 'connected' ? (
        <div style={{ 
          marginBottom: '15px', 
          padding: '15px', 
          border: '1px solid var(--border-color-dark)', 
          borderRadius: '6px', 
          backgroundColor: 'var(--background-dark)', 
          color: 'var(--text-dark)',
          boxShadow: 'none' 
        }}>
          <p style={{ margin: '5px 0' }}>
            <strong>Status:</strong> <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ {account.status}</span>
          </p>
          {account.addresses && account.addresses.length > 0 && (
            <p style={{ margin: '5px 0' }}>
              <strong>🆔 Address:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>{account.addresses[0]}</span>
            </p>
          )}
          <p style={{ margin: '5px 0' }}>
            <strong>🔗 Chain ID:</strong> {account.chainId}
          </p>
          <button 
            type="button" 
            onClick={() => disconnect()} 
            style={{ 
              marginTop: '15px', 
              padding: '8px 12px', 
              backgroundColor: '#e74c3c', // A slightly softer red
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontWeight: '500' // Consistent with global button
            }}
          >
            🔌 Disconnect
          </button>
        </div>
      ) : account.status === 'connecting' || account.status === 'reconnecting' ? (
        <p>⏳ Status: {account.status}...</p>
      ) : ( // Disconnected status
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>🔌 Status: {account.status}</p>
      )} 


      {/* Connection buttons remain if not connected */}
      {account.status !== 'connected' && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          border: '1px solid var(--border-color-dark)', 
          borderRadius: '6px', 
          backgroundColor: 'var(--background-dark)', 
          color: 'var(--text-dark)',
          boxShadow: 'none'
        }}>
          <h2 style={{ 
            marginTop: '0', 
            marginBottom: '10px',
            color: 'var(--primary-color)', 
            fontSize: '1.3em'
          }}>
            🔗 Connect
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {/* Buttons will inherit global styles */}
            {connectors.map((connector) => (
              <button 
                key={connector.uid} 
                onClick={() => connect({ connector })} 
                type="button"
                style={{
                  // Using global button styles, but can add specific overrides if needed
                  // e.g., width: '100%' if they should be full-width
                  width: '100%', 
                  textAlign: 'center',
                  padding: '10px 15px' // Keep custom padding if desired
                }}
                // Removed JS hover effects, rely on CSS :hover from globals.css
              >
                🔌 {connector.name}
              </button>
            ))}
          </div>
          {/* Ensure status and error messages here are also dark */}
          {status && status !== 'idle' && <div style={{ marginTop: '15px', color: 'var(--text-dark)', opacity: 0.8 }}>ℹ️ Connection Status: {status}</div>}
          {connectError && <div style={{ marginTop: '10px', color: '#e74c3c', fontWeight: 'bold' }}>❌ Error: {connectError?.message}</div>}
        </div>
      )}
    </div>
  );
}