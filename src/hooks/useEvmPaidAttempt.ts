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
import {
  EVM_PAYMENT_DEV_HINT,
  PAYMENT_UNAVAILABLE_MESSAGE,
} from '../config/payment';

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
      setError('Connect wallet first');
      return null;
    }

    setPending(true);
    setError(null);

    try {
      if (chainId !== EVM_CHAIN_ID) {
        await switchChainAsync({ chainId: EVM_CHAIN_ID });
      }

      const prep = await preparePaidAttempt(address, 'evm');
      setHourBucket(prep.hourBucket);

      if (prep.ready && prep.depositTx) {
        setDepositTx(prep.depositTx);
        return prep.depositTx;
      }

      if (prep.paymentAvailable === false) {
        if (import.meta.env.DEV) {
          console.warn(prep.developerHint ?? EVM_PAYMENT_DEV_HINT);
        }
        setError(PAYMENT_UNAVAILABLE_MESSAGE);
        return null;
      }

      const vaultAddress =
        (prep.accounts?.evmVault as `0x${string}` | undefined) ?? EVM_VAULT_ADDRESS;
      if (!vaultAddress) {
        if (import.meta.env.DEV) {
          console.warn(prep.developerHint ?? EVM_PAYMENT_DEV_HINT);
        }
        setError(PAYMENT_UNAVAILABLE_MESSAGE);
        return null;
      }

      const hash = await writeContractAsync({
        address: EVM_USDT_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [vaultAddress, EVM_USDT_PER_ATTEMPT],
        chainId: EVM_CHAIN_ID,
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      setDepositTx(hash);
      return hash;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'EVM payment failed';
      if (import.meta.env.DEV) console.warn(msg);
      setError(PAYMENT_UNAVAILABLE_MESSAGE);
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
