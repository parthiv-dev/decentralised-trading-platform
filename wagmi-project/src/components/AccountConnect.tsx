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
    <div>
      <h2>Account</h2>
      <div>
        status: {account.status}
        <br />
        addresses: {JSON.stringify(account.addresses)}
        <br />
        chainId: {account.chainId}
      </div>

      {account.status === 'connected' && (
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      )}

      {account.status !== 'connected' && (
        <div style={{ marginTop: '10px' }}>
          <h2>Connect</h2>
          {connectors.map((connector) => (
            <button key={connector.uid} onClick={() => connect({ connector })} type="button">
              {connector.name}
            </button>
          ))}
          <div>{status}</div>
          <div>{connectError?.message}</div>
        </div>
      )}
    </div>
  );
}