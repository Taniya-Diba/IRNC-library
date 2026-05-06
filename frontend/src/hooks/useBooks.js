import { useState, useEffect, useCallback } from 'react';
import { books as booksApi } from '../lib/api.js';

export function useBooks(initialParams = {}) {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [params, setParams]   = useState(initialParams);

  const fetch = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const merged = { ...params, ...overrides };
      const res = await booksApi.list(merged);
      setData(res.data || []);
      setTotal(res.total || 0);
      setParams(merged);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  return { data, total, loading, error, refetch: fetch, setParams };
}

export default useBooks;
