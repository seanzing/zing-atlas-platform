"use client";

import { SWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { ReactNode } from "react";

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
      {children}
    </SWRConfig>
  );
}
