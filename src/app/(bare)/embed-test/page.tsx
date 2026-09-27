export default function EmbedTestPage() {
  return (
    <iframe
      src="/wsp"
      className="mx-auto h-screen w-4/5 border-4"
      title="Embedded The Lot"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
