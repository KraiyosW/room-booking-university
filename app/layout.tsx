import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Space — ระบบจองห้องอ่านหนังสือ",
  description: "ดูเวลาว่างและจองห้องอ่านหนังสือของมหาวิทยาลัย",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
