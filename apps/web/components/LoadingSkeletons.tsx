import { Skeleton, InputSkeleton, TextSkeleton, ButtonSkeleton, AvatarSkeleton } from './Skeleton';

export function ProfileLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Profile Header Skeleton */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-3">
          <AvatarSkeleton />
          <div className="flex-1 space-y-2">
            <TextSkeleton width="w-32" />
            <TextSkeleton width="w-48" />
          </div>
        </div>
        <TextSkeleton width="w-24" />
      </div>

      {/* Form Fields Skeleton */}
      <div className="border-b border-gray-200">
        <div className="p-4 sm:p-6 space-y-1">
          <TextSkeleton width="w-40" />
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <TextSkeleton width="w-24 mb-2" />
              <InputSkeleton />
            </div>
            <div>
              <TextSkeleton width="w-24 mb-2" />
              <InputSkeleton />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <TextSkeleton width="w-24 mb-2" />
              <InputSkeleton />
            </div>
            <div>
              <TextSkeleton width="w-24 mb-2" />
              <InputSkeleton />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Sections Skeleton */}
      <div className="border-b border-gray-200">
        <div className="p-4 sm:p-6">
          <TextSkeleton width="w-40" />
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="p-4 sm:p-6">
          <TextSkeleton width="w-40" />
        </div>
      </div>

      {/* Save Button Skeleton */}
      <div className="p-4 sm:p-6">
        <ButtonSkeleton />
      </div>
    </div>
  );
}

export function PaymentLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 space-y-2">
          <TextSkeleton width="w-48" />
          <TextSkeleton width="w-64" />
        </div>

        <div className="space-y-5">
          <div>
            <TextSkeleton width="w-32 mb-2" />
            <InputSkeleton />
          </div>
          <div>
            <TextSkeleton width="w-32 mb-2" />
            <InputSkeleton />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <TextSkeleton width="w-24 mb-2" />
              <InputSkeleton />
            </div>
            <div>
              <TextSkeleton width="w-24 mb-2" />
              <InputSkeleton />
            </div>
          </div>
          <div>
            <TextSkeleton width="w-32 mb-2" />
            <InputSkeleton />
          </div>
          <div className="pt-2">
            <ButtonSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertsLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 space-y-2">
          <TextSkeleton width="w-48" />
          <TextSkeleton width="w-64" />
        </div>

        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1">
                <TextSkeleton width="w-40 mb-2" />
                <TextSkeleton width="w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PreferencesLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Sub-tabs skeleton */}
        <div className="flex gap-2 mb-6 pb-4 border-b border-gray-200">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          <div>
            <TextSkeleton width="w-40 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
