'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDepartments } from '@/lib/api';
import { Department } from '@/lib/supabase';

export function useDepartments(enabled = true) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err: unknown) {
      setDepartments([]);
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const departmentNames = departments.map((d) => d.name).filter(Boolean);

  return { departments, departmentNames, loading, error, reload };
}
