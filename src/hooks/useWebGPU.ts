import { useEffect, useState } from 'react';

/** null while checking */
export function useWebGPU(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) {
      setSupported(false);
      return;
    }
    gpu
      .requestAdapter()
      .then((adapter) => setSupported(!!adapter))
      .catch(() => setSupported(false));
  }, []);
  return supported;
}
