export function SocialIcon({ platform, size = 16, color = 'currentColor', className }: { platform: string; size?: number; color?: string; className?: string }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className };
  switch (platform) {
    case 'twitter':
    case 'x':
      return <svg {...props}><path d="M4 4l11.733 16H20L8.267 4z" /><path d="M4 20l6.768-6.768M15.232 10.232L20 4" /></svg>;
    case 'facebook':
      return <svg {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
    case 'tiktok':
      return <svg {...props}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
    default: // instagram
      return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill={color} stroke="none" /></svg>;
  }
}
