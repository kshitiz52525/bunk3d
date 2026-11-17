import Link from 'next/link';

const CONSOLES = [
  ['/crew-hq', 'Crew HQ', 'Club leads'], ['/college-hq', 'College HQ', 'Campus admins'], ['/collab-hq', 'Collab HQ', 'Brands'],
  ['/vendor', 'Vendor', 'Vendors'], ['/finance', 'Finance', 'Bunk3d finance'], ['/ops', 'Ops', 'Bunk3d operations'],
];

export default function Home() {
  return (
    <main>
      <h1 className="display wordmark" aria-label="Bunk3d">bunk<b>3</b>d</h1>
      <p className="muted">Web consoles</p>
      <div className="grid">
        {CONSOLES.map(([href, name, who]) => (
          <Link key={href} href={href} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong className="display">{name}</strong><p className="muted">{who}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
