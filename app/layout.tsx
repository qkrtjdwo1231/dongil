import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "동일유리 작업관리",
  description: "동일유리 내부 주문 및 작업 등록을 위한 업무용 웹앱 MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
