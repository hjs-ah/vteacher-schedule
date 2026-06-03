import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOW Center — Teaching Schedule",
  description: "Ministry teaching schedule for Bible Study, Discipleship, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('vow-theme') || 'light';
                  document.documentElement.setAttribute('data-theme', t);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
