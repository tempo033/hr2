import type { Metadata } from 'next';
import './globals.css';
import AppShell from './AppShell';

export const metadata: Metadata = { title: 'البنية الاساسية للمقاولات | إدارة طلبات الموارد البشرية', description: 'نظام إنشاء وتحليل طلبات التوظيف والتدريب والتجربة والتقييم' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><AppShell>{children}</AppShell></body></html>;
}