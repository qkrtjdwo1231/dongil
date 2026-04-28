import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "동일유리 작업관리",
  description: "동일유리의 주문 등록, 업로드 분석, 팀장/대표용 대시보드를 위한 내부 업무 시스템"
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
