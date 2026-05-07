'use client';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { fetchTransit, addTransit, updateTransit, deleteTransit } from '@travyl/shared';
import type { TransitData, TransitSegment } from '@travyl/shared';
import { TransitCard } from './TransitCard';
import { TransitForm } from './TransitForm';
import { buildTransitCardViewModel } from './types';

interface TransitsModuleProps {
  tripId: string;
  defaultCurrency?: string;
}

export function TransitsModule({ tripId, defaultCurrency = 'USD' }: TransitsModuleProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const { data: rawBookings = [], isLoading, error } = useQuery({
    queryKey: ['transit', tripId],
    queryFn: () => fetchTransit(tripId),
    staleTime: 5 * 60 * 1000,
  });

  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const hasExpandedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasExpandedRef.current) return;
    const expand = searchParams.get('expand');
    if (expand && rawBookings.some((b) => b.id === expand)) {
      setEditingId(expand);
      hasExpandedRef.current = true;
    }
  }, [searchParams, rawBookings]);

  React.useEffect(() => {
    function handleAdd() { setAdding(true); }
    window.addEventListener('transit:add', handleAdd);
    return () => window.removeEventListener('transit:add', handleAdd);
  }, []);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['transit', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
  }

  const addMutation = useMutation({
    mutationFn: (data: TransitData) => addTransit(tripId, { trip_id: tripId, data }),
    onSuccess: () => { setAdding(false); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransitData }) => updateTransit(id, { data }),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransit(id),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const bookings = React.useMemo(
    () => rawBookings
      .map((b: TransitSegment) => ({ ...buildTransitCardViewModel(b.data), id: b.id }))
      .sort((a, b) => {
        if (!a.departureAt && !b.departureAt) return 0;
        if (!a.departureAt) return 1;
        if (!b.departureAt) return -1;
        return new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime();
      }),
    [rawBookings],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-red-500">Could not load transit bookings.</p>
      </div>
    );
  }

  if (bookings.length === 0 && !adding) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] font-medium text-gray-900 dark:text-white">No transit bookings yet</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Add a transit leg to your trip</p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 px-4 h-9 rounded-xl text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          Add Transit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {adding && (
        <TransitForm
          onSubmit={(data) => addMutation.mutateAsync(data)}
          onCancel={() => setAdding(false)}
          defaultCurrency={defaultCurrency}
        />
      )}
      {bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((vm) =>
            editingId === vm.id ? (
              (() => {
                const segment = rawBookings.find((b: TransitSegment) => b.id === vm.id);
                if (!segment) return null;
                return (
                  <TransitForm
                    key={vm.id}
                    initial={{ ...segment.data, id: segment.id }}
                    onSubmit={(data) => updateMutation.mutateAsync({ id: vm.id, data })}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => deleteMutation.mutateAsync(vm.id)}
                    defaultCurrency={defaultCurrency}
                  />
                );
              })()
            ) : (
              <TransitCard
                key={vm.id}
                booking={vm}
                onEdit={() => setEditingId(vm.id)}
                onDelete={() => deleteMutation.mutateAsync(vm.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
