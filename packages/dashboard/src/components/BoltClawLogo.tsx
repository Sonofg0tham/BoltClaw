export function BoltClawLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BoltClaw"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Three red claw slashes */}
      <path 
        d="M12 8L4 32M24 6L16 34M36 4L28 36" 
        stroke="#ef4444" 
        strokeWidth="4" 
        strokeLinecap="round" 
        filter="url(#glow)"
        opacity="0.8"
      />
      {/* Sharp white lightning bolt cutting across */}
      <path 
        d="M42 16L20 28V22H6L28 10V16L42 16Z" 
        fill="white" 
      />
    </svg>
  );
}
