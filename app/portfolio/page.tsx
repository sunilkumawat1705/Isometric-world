import Link from "next/link";
import { ResumeDetails } from "@/components/village/ResumeDetails";
import {
  locations,
  portfolio,
  projects,
  skillGroups,
  experiences,
} from "@/lib/village/data";
export const metadata = { title: `${portfolio.name} · Standard portfolio` };
export default function PortfolioPage() {
  return (
    <main className="standard-portfolio">
      <header>
        <Link href="/">← Return to the village</Link>
        <span>Forest Village</span>
      </header>
      <section className="standard-intro">
        <span className="panel-eyebrow">THE DEVELOPER BEHIND THE VILLAGE</span>
        <h1>{portfolio.name}</h1>
        <p>{portfolio.role}</p>
        <nav aria-label="Portfolio sections">
          {locations.map((l) => (
            <a key={l.id} href={`#${l.id}`}>
              {l.id}
            </a>
          ))}
        </nav>
      </section>
      <section id="about">
        <h2>About me</h2>
        <p>{portfolio.description}</p>
        <p>{portfolio.intro}</p>
        <ResumeDetails />
      </section>
      <section id="projects">
        <h2>Selected work</h2>
        <p>
          Professional contributions at The Developer Company, documented in my
          resume.
        </p>
        <div className="standard-projects">
          {projects.map((p) => (
            <article key={p.id}>
              <small>{p.type}</small>
              <h3>{p.title}</h3>
              <p>{p.longDescription ?? p.description}</p>
              <div className="village-tags">
                {p.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="skills">
        <h2>Skills library</h2>
        <p>
          Languages, frameworks, databases, and tools from my technical toolkit.
        </p>
        <div className="skills-list">
          {skillGroups.map((g) => (
            <article key={g.title}>
              <h3>{g.title}</h3>
              <p>{g.description}</p>
              <div className="village-tags">
                {g.items.map((i) => (
                  <span key={i}>{i}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="experience">
        <h2>Experience</h2>
        {experiences.length ? (
          experiences.map((e) => (
            <article key={e.id}>
              <h3>
                {e.position} · {e.company}
              </h3>
              <p>{e.dates}</p>
              <ul>
                {e.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="village-tags">
                {e.technologies.map((technology) => (
                  <span key={technology}>{technology}</span>
                ))}
              </div>
              {e.outcome && <p>{e.outcome}</p>}
            </article>
          ))
        ) : (
          <p>Professional history hasn’t been added yet.</p>
        )}
      </section>
      <section id="contact">
        <h2>Let’s talk</h2>
        {portfolio.email ? (
          <a href={`mailto:${portfolio.email}`}>{portfolio.email}</a>
        ) : (
          <p>An email address hasn’t been configured yet.</p>
        )}
        <a href={portfolio.phoneHref}>{portfolio.phone}</a>
        <a href={portfolio.resumeUrl} download>
          Download resume (.docx)
        </a>
        {portfolio.github && <a href={portfolio.github}>GitHub</a>}
        {portfolio.linkedin && <a href={portfolio.linkedin}>LinkedIn</a>}
      </section>
      <footer>{portfolio.name} · Made with curiosity and care.</footer>
    </main>
  );
}
