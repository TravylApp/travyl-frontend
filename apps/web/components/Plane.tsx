import Image from 'next/image';


export function Plane() {
  return (
    <Image 
        src="/icons/plane-icon.png" 
        alt="Plane" 
        width={32} 
        height={32}
        className="w-6 h-6 md:w-8 md:h-8 mix-blend-multiply"
    />
  );
}