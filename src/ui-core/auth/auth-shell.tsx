import { ReactNode } from "react";
import Image from "next/image";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5ead9] px-6 py-12 text-[#161616]">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border-2 border-black shadow-[10px_10px_0_#161616] md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-white p-10 md:flex">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-pink-600">
              PMFreak
            </p>

            <h2 className="mt-4 text-3xl font-black leading-tight">
              Keep projects aligned.
              <br />
              Lead with clarity.
            </h2>

            <p className="mt-4 text-sm font-medium text-black/70">
              PMFreak helps you spot risks early, align stakeholders, and move projects forward with confidence.
            </p>
          </div>

          <div className="mt-10">
            <Image
              src="/Cara.png"
              alt="PMFreak"
              width={200}
              height={200}
              className="object-contain"
            />
          </div>
        </div>

        <div className="bg-[#fffaf2] p-8 md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">
            PMFreak
          </p>

          <h1 className="mt-3 text-2xl font-black">{title}</h1>

          <p className="mt-2 text-sm font-medium text-black/70">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
