import Logo from '../Logo';

export default function LogoExample() {
  return (
    <div className="flex items-center gap-4 p-8">
      <Logo className="w-10 h-10" />
      <Logo className="w-16 h-16" />
      <Logo className="w-24 h-24" />
    </div>
  );
}
