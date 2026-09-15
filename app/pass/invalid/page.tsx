export default function InvalidPass() {
  return (
    <main style={{ maxWidth: 520, margin: "80px auto", padding: "0 24px",
                   fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 26 }}>That link didn&apos;t work.</h1>
      <p>
        Either it expired, or Moira ate it. She does that.
      </p>
      <p>
        If you bought a Veil Season Pass, go to{" "}
        <a href="/pass">horrorscope.art/pass</a> and enter the email you used.
        We&apos;ll send a fresh link.
      </p>
      <p style={{ fontSize: 14, color: "#666" }}>
        The pass runs through November 15, 2026.
      </p>
    </main>
  );
}
