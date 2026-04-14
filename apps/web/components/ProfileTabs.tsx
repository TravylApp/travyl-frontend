import { Heart, Globe, LayoutGrid } from "lucide-react";

interface ProfileTabsProps {
  activeTab: "boards" | "favorites" | "globe";
  onTabChange: (tab: "boards" | "favorites" | "globe") => void;
  boardsCount: number;
  favoritesCount: number;
}

export function ProfileTabs({ activeTab, onTabChange, boardsCount, favoritesCount }: ProfileTabsProps) {
  return (
    <div className="bg-[#1e3a5f] border-t border-white/5 relative shadow-inner">
      <div className="max-w-[1400px] mx-auto flex items-center gap-1 sm:gap-2 px-4 sm:px-8 lg:px-12">
        <TabButton
          label="Travel Boards"
          icon={<LayoutGrid size={15} />}
          count={boardsCount}
          isActive={activeTab === "boards"}
          onClick={() => onTabChange("boards")}
        />
        <TabButton
          label="Favorites"
          icon={<Heart size={15} />}
          count={favoritesCount}
          isActive={activeTab === "favorites"}
          onClick={() => onTabChange("favorites")}
        />
        <TabButton
          label="Globe"
          icon={<Globe size={15} />}
          isActive={activeTab === "globe"}
          onClick={() => onTabChange("globe")}
        />
      </div>
    </div>
  );
}

function TabButton({ 
  label, 
  icon, 
  count, 
  isActive, 
  onClick 
}: { 
  label: string; 
  icon: React.ReactNode; 
  count?: number; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 sm:px-6 py-4 transition-all duration-300 group overflow-hidden ${
        isActive 
          ? "text-white" 
          : "text-white/40 hover:text-white/70"
      }`}
    >
      <span className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
        {icon}
      </span>
      <span className="text-[13px] font-bold tracking-tight whitespace-nowrap">
        {label}
        {count !== undefined && (
          <span className={`ml-1.5 opacity-50 font-medium ${isActive ? "text-white" : ""}`}>
            ({count})
          </span>
        )}
      </span>
      
      {/* Active Indicator Line */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-1 bg-[#3b82f6] transition-all duration-300 ${
          isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-50"
        }`} 
      />
      
      {/* Hover Background */}
      <div className={`absolute inset-0 bg-white/5 transition-opacity duration-300 pointer-events-none ${
        isActive ? "opacity-10" : "opacity-0 group-hover:opacity-100"
      }`} />
    </button>
  );
}