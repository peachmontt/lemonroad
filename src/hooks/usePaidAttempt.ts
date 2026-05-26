import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { preparePaidAttempt } from '../lib/api';
import { buildDepositAttemptTransaction } from '../lib/pool';
import { PROGRAM_ID } from '../config/solana';
import {
  PAYMENT_SAVE_ERROR_MESSAGE,
  PAYMENT_UNAVAILABLE_MESSAGE,
  SOLANA_PAYMENT_DEV_HINT,
} from '../config/payment';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
import { USDT_MINT, USDT_PER_ATTEMPT } from '../config/solana';

function reportPaymentConfigIssue(developerHint?: string) {
  if (import.meta.env.DEV) {
    console.warn(developerHint ?? SOLANA_PAYMENT_DEV_HINT);
  }
}

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

      if (prep.paymentAvailable === false) {
        reportPaymentConfigIssue(prep.developerHint);
        setError(PAYMENT_UNAVAILABLE_MESSAGE);
        return null;
      }

      const vaultAta = prep.accounts?.vaultAta;
      if (!vaultAta) {
        reportPaymentConfigIssue(prep.developerHint);
        setError(PAYMENT_UNAVAILABLE_MESSAGE);
        return null;
      }

      let tx: Transaction | null = null;

      if (PROGRAM_ID) {
        tx = buildDepositAttemptTransaction(publicKey, prep.hourBucket);
      }

      if (!tx) {
        const vault = new PublicKey(vaultAta);
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
            vault,
            publicKey,
            USDT_PER_ATTEMPT,
            6,
          ),
        );
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
      if (import.meta.env.DEV) console.warn(msg);
      setError(
        msg.includes('Payment could not be saved')
          ? PAYMENT_SAVE_ERROR_MESSAGE
          : PAYMENT_UNAVAILABLE_MESSAGE,
      );
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
