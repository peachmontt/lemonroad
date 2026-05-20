import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { preparePaidAttempt } from '../lib/api';
import {
  EVM_CHAIN_ID,
  EVM_USDT_ADDRESS,
  EVM_USDT_PER_ATTEMPT,
  EVM_VAULT_ADDRESS,
} from '../config/evm';

export function useEvmPaidAttempt() {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();

  const [pending, setPending] = useState(false);
  const [depositTx, setDepositTx] = useState<string | null>(null);
  const [hourBucket, setHourBucket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payForAttempt = useCallback(async (): Promise<string | null> => {
    if (!address) {
      setError('Connect MetaMask first');
      return null;
    }

    setPending(true);
    setError(null);

    try {
      // Switch to the correct EVM chain if needed
      if (chainId !== EVM_CHAIN_ID) {
        await switchChainAsync({ chainId: EVM_CHAIN_ID });
      }

      // Check for an existing unused deposit on the server
      const prep = await preparePaidAttempt(address, 'evm');
      setHourBucket(prep.hourBucket);

      if (prep.ready && prep.depositTx) {
        setDepositTx(prep.depositTx);
        return prep.depositTx;
      }

      const vaultAddress = (prep.accounts?.evmVault as `0x${string}` | undefined) ?? EVM_VAULT_ADDRESS;
      if (!vaultAddress) {
        throw new Error('EVM vault not configured — contact support');
      }

      // Execute ERC-20 USDT transfer to vault
      const hash = await writeContractAsync({
        address: EVM_USDT_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [vaultAddress, EVM_USDT_PER_ATTEMPT],
        chainId: EVM_CHAIN_ID,
      });

      // Wait for on-chain confirmation
      await publicClient?.waitForTransactionReceipt({ hash });

      setDepositTx(hash);
      return hash;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'EVM payment failed';
      setError(msg);
      return null;
    } finally {
      setPending(false);
    }
  }, [address, chainId, writeContractAsync, switchChainAsync, publicClient]);

  const reset = useCallback(() => {
    setDepositTx(null);
    setHourBucket(null);
    setError(null);
  }, []);

  return { pending, depositTx, hourBucket, error, payForAttempt, reset, address };
}
