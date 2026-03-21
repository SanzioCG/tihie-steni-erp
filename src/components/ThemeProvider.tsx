import { ThemeProvider as NextThemesProvider } from "next-themes";

// TypeScript xatosini yo'qotish uchun props turini vaqtincha 'any' qilib belgilaymiz
export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}