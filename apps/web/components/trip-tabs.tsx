"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { segment: "", label: "Overview" },
  { segment: "itinerary", label: "Itinerary" },
  { segment: "flights", label: "Flights" },
  { segment: "hotels", label: "Hotels" },
  { segment: "cars", label: "Car Rental" },
  { segment: "budget", label: "Budget" },
  { segment: "packing", label: "Packing" },
  { segment: "activities", label: "Activities" },
  { segment: "restaurants", label: "Restaurants" },
  { segment: "favorites", label: "Favorites" },
];

export default function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;

  function isActive(segment: string) {
    const tabPath = segment ? `${basePath}/${segment}` : basePath;
    return pathname === tabPath;
  }

  return (
    <div className="border-b border-border">
      <div className="flex overflow-x-auto">
        {tabs.map(({ segment, label }) => (
          <Link
            key={segment}
            href={segment ? `${basePath}/${segment}` : basePath}
            className={`relative shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive(segment)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {isActive(segment) && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
