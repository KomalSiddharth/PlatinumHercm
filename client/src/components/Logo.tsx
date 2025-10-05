export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="48" fill="hsl(174 86% 24%)" />
      <path
        d="M35 55 L35 35 L50 35 C57 35 62 40 62 47 C62 54 57 55 50 55 L35 55 Z M35 35 L35 70"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M55 45 L70 30"
        stroke="hsl(12 100% 65%)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M65 30 L70 30 L70 35"
        stroke="hsl(12 100% 65%)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
