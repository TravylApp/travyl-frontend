import Image from 'next/image';

export function Header() {
  return (
    <header className="w-full flex items-center justify-between bg-white px-6 py-3 md:px-12 md:py-4 shadow-sm relative z-20">
      <div className="flex items-center gap-2">
        <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#1c398e] bg-clip-text text-transparent tracking-wide">
          TRAVYL
        </span>
                <Image 
                    src="/icons/plane-icon.png" 
                    alt="Plane" 
                    width={32} 
                    height={32}
                    className="w-6 h-6 md:w-8 md:h-8 mix-blend-multiply"
                />   
      </div>
      <div className="flex items-center gap-6 md:gap-8">
        <button className="hidden sm:block text-sm md:text-base text-gray-700 hover:text-[#3b82f6] transition-colors">Discover</button>
        <button className="hidden sm:block text-sm md:text-base text-gray-700 hover:text-[#3b82f6] transition-colors">Trip</button>
        <button className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] flex items-center justify-center text-white text-xs md:text-sm shadow-lg">
          N
        </button>
      </div>
    </header>
  );
}