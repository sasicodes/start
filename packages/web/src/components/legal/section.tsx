import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export const Section = ({ title, children }: SectionProps) => {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold -tracking-[0.5px] text-zinc-900">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
};
