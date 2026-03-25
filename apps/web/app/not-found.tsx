import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-serif font-normal text-gray-900 mb-2 tracking-wide">404</h1>
      <p className="text-gray-600 mb-6">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
        style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
      >
        Go Home
      </Link>
    </div>
  );
}
