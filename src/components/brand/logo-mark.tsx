import Image from "next/image";
import Link from "next/link";

const sizeClasses = {
  small: "h-9 w-9 rounded-xl p-1.5",
  navbar: "h-11 w-11 rounded-2xl p-2",
  large: "h-14 w-14 rounded-2xl p-2.5",
} as const;

type LogoMarkProps = {
  size?: keyof typeof sizeClasses;
  href?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

export function LogoMark({ size = "navbar", href = "/", priority = false, className = "", imageClassName = "" }: LogoMarkProps) {
  const shellClass = `relative inline-flex items-center justify-center border border-white/55 bg-gradient-to-br from-[#fffcf4] to-[#f1e8d8] shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_8px_30px_rgba(34,16,58,0.3),0_0_35px_rgba(34,211,238,0.2)] ring-1 ring-[#22d3ee]/35 ${sizeClasses[size]} ${className}`;

  return (
    <Link href={href} aria-label="PMFreak Home" className={shellClass}>
      <span className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),rgba(255,255,255,0.06))]" aria-hidden />
      <Image
        src="/assets/LogoTrazoBlanco.png"
        alt="PM Freak"
        width={96}
        height={96}
        priority={priority}
        className={`relative h-full w-full object-contain ${imageClassName}`}
      />
    </Link>
  );
}
