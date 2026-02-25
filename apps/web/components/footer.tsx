import Image from 'next/image';


export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#f0f4f8] to-[#e8eef5] text-gray-700 mt-16 py-12 relative z-10 border-t-4 border-[#3b82f6]">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#1c398e] bg-clip-text text-transparent">TRAVYL</span>
                <Image 
                    src="/icons/plane-icon.png" 
                    alt="Plane" 
                    width={32} 
                    height={32}
                    className="w-6 h-6 md:w-8 md:h-8 mix-blend-multiply"
                />            
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Discover and plan your perfect trip from one place. Explore destinations, find the best hotels and flights, and create unforgettable itineraries.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-bold text-base text-[#1c398e] tracking-wider">Company</h3>
            <ul className="space-y-3 text-sm">
              <li className="hover:text-[#3b82f6] transition-colors cursor-pointer">About Us</li>
              <li className="hover:text-[#3b82f6] transition-colors cursor-pointer">Contact</li>
              <li className="hover:text-[#3b82f6] transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-[#3b82f6] transition-colors cursor-pointer">Terms of Service</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-300 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© 2025 Travyl. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}