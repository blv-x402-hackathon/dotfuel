import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "DotFuel Demo",
  description: "DotFuel — Pay gas with any token"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui", background: "#f5f7fb" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
