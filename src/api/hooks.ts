// React hooks for data fetching from the API
import { useState, useEffect, useCallback } from 'react';
import { api, ActivityItem, ListingInfo, OfferInfo, NFTDetails, NFTWithListingStatus, HealthResponse } from './client';
import { useCosmos } from '../hooks/useCosmos';

interface UseDataResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  source: 'indexer' | 'rpc' | null;
  refetch: () => Promise<void>;
}

// Hook to check API health and data source
export function useApiHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getHealth();
      setHealth(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { health, loading, error, refetch };
}

// Hook for activity history
export function useActivity(limit = 50): UseDataResult<ActivityItem[]> {
  const { config } = useCosmos();
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getActivity({ limit, assetContract: config.assetContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit, config.assetContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}

// Hook for marketplace listings
export function useListings(): UseDataResult<ListingInfo[]> {
  const { config } = useCosmos();
  const [data, setData] = useState<ListingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getListings({ assetContract: config.assetContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [config.assetContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}

// Hook for offers on a specific token
export function useOffers(tokenId: string | null): UseDataResult<OfferInfo[]> {
  const { config } = useCosmos();
  const [data, setData] = useState<OfferInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    if (!tokenId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getOffers(tokenId, { marketplaceContract: config.marketplaceContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [tokenId, config.marketplaceContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}

// Hook for NFT details
export function useNFTDetails(tokenId: string | null): UseDataResult<NFTDetails | null> {
  const { config } = useCosmos();
  const [data, setData] = useState<NFTDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    if (!tokenId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getNFT(tokenId, { assetContract: config.assetContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tokenId, config.assetContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}

// Hook for user's active listings
export function useUserListings(address: string | null): UseDataResult<ListingInfo[]> {
  const { config } = useCosmos();
  const [data, setData] = useState<ListingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    if (!address) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getUserListings(address, { assetContract: config.assetContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [address, config.assetContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}

// Hook for user's owned NFTs
export function useUserNFTs(address: string | null): UseDataResult<NFTDetails[]> {
  const { config } = useCosmos();
  const [data, setData] = useState<NFTDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    if (!address) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getUserNFTs(address, { assetContract: config.assetContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [address, config.assetContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}

// Hook for all NFTs with listing status (Explore page)
export function useAllNFTs(limit = 100): UseDataResult<NFTWithListingStatus[]> {
  const { config } = useCosmos();
  const [data, setData] = useState<NFTWithListingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'indexer' | 'rpc' | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getAllNFTs({ limit, assetContract: config.assetContract });
      setData(response.data);
      setSource(response.source);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit, config.assetContract]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, source, refetch };
}
