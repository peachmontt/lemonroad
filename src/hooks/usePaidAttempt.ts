import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { preparePaidAttempt } from '../lib/api';
import { buildDepositAttemptTransaction } from '../lib/pool';
import { PROGRAM_ID } from '../config/solana';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
import { USDT_MINT, USDT_PER_ATTEMPT } from '../config/solana';

export function usePaidAttempt() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [pending, setPending] = useState(false);
  const [depositTx, setDepositTx] = useState<string | null>(null);
  const [hourBucket, setHourBucket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payForAttempt = useCallback(async (): Promise<string | null> => {
    if (!publicKey) {
      setError('Connect wallet first');
      return null;
    }

    setPending(true);
    setError(null);

    try {
      const prep = await preparePaidAttempt(publicKey.toBase58());
      setHourBucket(prep.hourBucket);

      if (prep.ready && prep.depositTx) {
        setDepositTx(prep.depositTx);
        return prep.depositTx;
      }

      let tx: Transaction | null = null;

      if (PROGRAM_ID && prep.accounts?.vaultAta) {
        tx = buildDepositAttemptTransaction(publicKey, prep.hourBucket);
      }

      if (!tx && prep.accounts?.vaultAta) {
        const vaultAta = new PublicKey(prep.accounts.vaultAta);
        const userAta = getAssociatedTokenAddressSync(USDT_MINT, publicKey, false);
        tx = new Transaction();
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            userAta,
            publicKey,
            USDT_MINT,
          ),
          createTransferCheckedInstruction(
            userAta,
            USDT_MINT,
            vaultAta,
            publicKey,
            USDT_PER_ATTEMPT,
            6,
          ),
        );
      }

      if (!tx) {
        throw new Error('Pool not configured — set VITE_PROGRAM_ID or POOL vault');
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });

      setDepositTx(sig);
      return sig;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      setError(msg);
      return null;
    } finally {
      setPending(false);
    }
  }, [publicKey, connection, sendTransaction]);

  const reset = useCallback(() => {
    setDepositTx(null);
    setHourBucket(null);
    setError(null);
  }, []);

  return {
    pending,
    depositTx,
    hourBucket,
    error,
    payForAttempt,
    reset,
  };
}
