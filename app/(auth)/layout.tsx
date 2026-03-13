// app/(auth)/layout.tsx
// Layout tối giản cho trang login - không có sidebar/header

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
