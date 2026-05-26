/** Display-only wallet memory. Never used to trigger connect on page load. */

const PROVIDER_KEY = 'lastWalletProvider';
const ADDRESS_KEY = 'lastWalletAddress';

export interface RememberedWallet {
  provider: string;
  address: string;
}

export function readRememberedWallet(): RememberedWallet | null {
  try {
    const provider = localStorage.getItem(PROVIDER_KEY);
    const address = localStorage.getItem(ADDRESS_KEY);
    if (!provider && !address) return null;
    return {
      provider: provider ?? '',
      address: address ?? '',
    };
  } catch {
    return null;
  }
}

export function saveRememberedWallet(provider: string, address: string): void {
  try {
    localStorage.setItem(PROVIDER_KEY, provider);
    localStorage.setItem(ADDRESS_KEY, address);
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function clearRememberedWallet(): void {
  try {
    localStorage.removeItem(PROVIDER_KEY);
    localStorage.removeItem(ADDRESS_KEY);
  } catch {
    // ignore
  }
}
