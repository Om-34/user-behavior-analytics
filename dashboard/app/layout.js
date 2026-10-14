import './globals.css';

export const metadata = { title: 'Behavior Analytics' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
