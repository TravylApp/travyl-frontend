import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const IOS_URL = 'https://testflight.apple.com/join/AV1Qc9vr'
const ANDROID_URL =
  process.env.NEXT_PUBLIC_ANDROID_INSTALL_URL ||
  'https://expo.dev/accounts/travyl/projects/mobile/builds/2f0478b7-f7d3-4739-b753-c372ac3d4278'

function detectPlatform(ua: string): 'ios' | 'android' | 'other' {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

export default async function GetPage() {
  const ua = (await headers()).get('user-agent') ?? ''
  const platform = detectPlatform(ua)

  if (platform === 'ios') redirect(IOS_URL)
  if (platform === 'android') redirect(ANDROID_URL)

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-[#0a1520] to-[#1e3a5f]">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/20 shadow-2xl">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Get Travyl</h1>
        <p className="text-white/70 mb-8">Scan from your phone, or pick a platform.</p>
        <div className="space-y-3">
          <Link
            href={IOS_URL}
            className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
          >
            Download for iPhone
          </Link>
          <Link
            href={ANDROID_URL}
            className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-[#3DDC84] text-black font-semibold hover:bg-[#3DDC84]/90 transition-colors"
          >
            Download for Android
          </Link>
        </div>
        <p className="text-white/40 text-xs mt-8">
          iOS via TestFlight · Android via direct install
        </p>
      </div>
    </div>
  )
}
