export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(348, 83%, 58%)" />
          <stop offset="50%" stopColor="hsl(320, 70%, 50%)" />
          <stop offset="100%" stopColor="hsl(240, 100%, 60%)" />
        </linearGradient>
      </defs>
      
      <circle cx="100" cy="100" r="95" fill="url(#logoGradient)" stroke="white" strokeWidth="6" />
      
      <g fill="white">
        <rect x="50" y="60" width="12" height="80" />
        <polygon points="65,60 85,100 85,60" />
        <polygon points="65,140 85,100 85,140" />
        
        <rect x="95" y="60" width="12" height="80" />
        <polygon points="107,60 107,100 127,60" />
        <polygon points="127,60 127,100 147,60" />
        <rect x="135" y="60" width="12" height="80" />
      </g>
    </svg>
  );
}
