export const metadata = {
  title: "Feedback",
  description: "AI Solutions feedback portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#f6f7f9" }}>
        {children}
      </body>
    </html>
  );
}

