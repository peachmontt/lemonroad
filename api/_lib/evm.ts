import { createPublicClient, http, type Hex } from 'viem';
import { mainnet, polygon, polygonAmoy } from 'viem/chains';

const EVM_CHAIN_ID = Number(process.env.EVM_CHAIN_ID ?? 80002);
const EVM_RPC_URL = process.env.EVM_RPC_URL;

const USDT_ADDRESSES: Record<number, Hex> = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  80002: '0x52D800ca262522580CeBAD275395ca6e7598C014',
};

const EVM_USDT_ADDRESS: Hex = USDT_ADDRESSES[EVM_CHAIN_ID] ?? USDT_ADDRESSES[80002];
/** 1 USDT (6 decimals) */
const EVM_USDT_PER_ATTEMPT = 1_000_000n;

function getEvmChain() {
  if (EVM_CHAIN_ID === 1) return mainnet;
  if (EVM_CHAIN_ID === 137) return polygon;
  return polygonAmoy;
}

function getClient() {
  return createPublicClient({
    chain: getEvmChain(),
    transport: http(EVM_RPC_URL),
  });
}

export function getEvmVaultAddress(): Hex | null {
  const addr = process.env.POOL_EVM_VAULT;
  if (!addr) return null;
  return addr as Hex;
}

export function getEvmChainId(): number {
  return EVM_CHAIN_ID;
}

/**
 * Verify that a given EVM tx hash contains a USDT ERC-20 Transfer of >= 1 USDT
 * from expectedWallet to the configured vault address.
 */
export async function verifyEvmDepositTransaction(
  txHash: string,
  expectedWallet: string,
): Promise<{ ok: boolean; error?: string }> {
  const vaultAddress = getEvmVaultAddress();
  if (!vaultAddress) {
    return { ok: false, error: 'EVM vault not configured (POOL_EVM_VAULT)' };
  }

  const client = getClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    return { ok: false, error: 'EVM transaction not found' };
  }

  if (receipt.status === 'reverted') {
    return { ok: false, error: 'EVM transaction reverted on-chain' };
  }

  // Look for an ERC-20 Transfer(from, to, value) log from the USDT contract
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== EVM_USDT_ADDRESS.toLowerCase()) continue;
    // Transfer topic: keccak256("Transfer(address,address,uint256)")
    if (log.topics[0] !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') continue;

    const topic1 = log.topics[1];
    const topic2 = log.topics[2];
    if (!topic1 || !topic2 || !log.data) continue;

    const from = `0x${topic1.slice(26)}`.toLowerCase();
    const to = `0x${topic2.slice(26)}`.toLowerCase();
    const value = BigInt(log.data);

    if (
      from === expectedWallet.toLowerCase() &&
      to === vaultAddress.toLowerCase() &&
      value >= EVM_USDT_PER_ATTEMPT
    ) {
      return { ok: true };
    }
  }

  return { ok: false, error: 'No valid USDT transfer to vault found in transaction' };
}
