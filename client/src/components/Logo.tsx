export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <img 
      src="https://www.miteshkhatri.com/wp-content/uploads/2022/09/NEW-IMK-LOGO.png"
      alt="Mitesh Khatri Logo"
      className={className}
    />
  );
}
