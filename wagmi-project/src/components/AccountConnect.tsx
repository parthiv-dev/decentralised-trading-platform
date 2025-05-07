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
    <div style={{ 
      backgroundColor: '#f7f9fc', // A very light, slightly cool gray background for the whole component
      padding: '20px', 
      borderRadius: '8px', 
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', // A slightly more pronounced but soft shadow
      color: '#333', // Default text color
      marginBottom: '20px' // Add some space below the component
    }}>
      <h2 style={{ 
        marginBottom: '10px', 
        borderBottom: '1px solid #e0e0e0', // Softer border color
        paddingBottom: '5px',
        color: '#2c3e50', // A darker, more refined blue-gray for headings
        fontSize: '1.5em'
      }}>
        Account
      </h2>
      {account.status === 'connected' ? (
        <div style={{ 
          marginBottom: '15px', 
          padding: '15px', 
          border: '1px solid #e0e0e0', 
          borderRadius: '6px', 
          backgroundColor: '#ffffff', // White background for the info box
          color: '#333',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <p style={{ margin: '5px 0' }}>
            <strong>Status:</strong> <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{account.status}</span>
          </p>
          {account.addresses && account.addresses.length > 0 && (
            <p style={{ margin: '5px 0' }}>
              <strong>Address:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{account.addresses[0]}</span>
            </p>
          )}
          <p style={{ margin: '5px 0' }}>
            <strong>Chain ID:</strong> {account.chainId}
          </p>
          <button 
            type="button" 
            onClick={() => disconnect()} 
            style={{ 
              marginTop: '10px', 
              padding: '8px 12px', 
              backgroundColor: '#e74c3c', // A slightly softer red
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Disconnect
          </button>
        </div>
      ) : account.status === 'connecting' || account.status === 'reconnecting' ? (
        <p>Status: {account.status}...</p>
      ) : ( // Disconnected status
        <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Status: {account.status}</p>
      )} 


      {/* Connection buttons remain if not connected */}
      {account.status !== 'connected' && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          border: '1px solid #ddd', 
          borderRadius: '6px', 
          backgroundColor: '#ffffff', // White background for this section too
          color: '#333',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ 
            marginTop: '0', 
            marginBottom: '10px',
            color: '#2c3e50', // Consistent heading color
            fontSize: '1.3em'
          }}>
            Connect
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {connectors.map((connector) => (
              <button 
                key={connector.uid} 
                onClick={() => connect({ connector })} 
                type="button"
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#3498db', // A nice blue
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  transition: 'background-color 0.2s ease-in-out'
                }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#2980b9')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#3498db')}
              >
                {connector.name}
              </button>
            ))}
          </div>
          {/* Ensure status and error messages here are also dark */}
          {status && status !== 'idle' && <div style={{ marginTop: '10px', color: '#555' }}>Connection Status: {status}</div>}
          {connectError && <div style={{ marginTop: '10px', color: '#c0392b', fontWeight: 'bold' }}>Error: {connectError?.message}</div>}
        </div>
      )}
    </div>
  );
}