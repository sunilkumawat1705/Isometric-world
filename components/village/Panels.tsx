"use client";
import Leaderboard from "./minigames/Leaderboard";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, BookOpen, Mail, Mountain, Phone, X } from "lucide-react";
import {
  locations,
  portfolio,
  projects,
  skillGroups,
  experiences,
  type Section,
} from "@/lib/village/data";
import VillageMap from "./VillageMap";
export { default as VillageMap } from "./VillageMap";
import { ResumeDetails } from "./ResumeDetails";
import { MAX_ZOOM, MIN_ZOOM, restoreFocus, useGame } from "@/lib/village/store";
export function PortfolioContent({ section }: { section: Section }) {
  const [filter, setFilter] = useState("All"),
    [detail, setDetail] = useState<string | null>(null);
  if (section === "about")
    return (
      <div className="about-content">
        <span className="portrait-mark">
          {portfolio.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </span>
        <h3>Hi, I’m {portfolio.name.split(" ")[0]}.</h3>
        <p className="profile-role">{portfolio.role}</p>
        <p>{portfolio.description}</p>
        <div className="panel-note">
          <strong>What I’m looking for</strong>
          <p>{portfolio.intro}</p>
        </div>
        <ResumeDetails />
      </div>
    );
  if (section === "projects")
    return (
      <>
        <p>
          Selected work at The Developer Company, drawn from my resume. These
          contributions cover multi-tenant platforms and e-commerce tooling.
        </p>
        <div className="project-filters" aria-label="Filter projects">
          {["All", "Websites", "Applications"].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setDetail(null);
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="village-projects">
          {projects
            .filter((p) => filter === "All" || p.category === filter)
            .map((p) => (
              <article key={p.id} className="village-project">
                <div className={`project-illustration project-${p.id}`}>
                  <span>{p.id === "site-builder" ? "⌘" : "◈"}</span>
                  <small>{p.type}</small>
                  <strong>{p.title}</strong>
                </div>
                <div className="project-copy">
                  <small>WORK · {p.category}</small>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <div className="village-tags">
                    {p.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  {p.liveUrl && (
                    <a
                      className="text-button"
                      href={p.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit project <ArrowUpRight size={16} />
                    </a>
                  )}
                  {p.githubUrl && (
                    <a
                      className="text-button"
                      href={p.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View code <ArrowUpRight size={16} />
                    </a>
                  )}
                  <button
                    className="text-button"
                    aria-expanded={detail === p.id}
                    onClick={() => setDetail(detail === p.id ? null : p.id)}
                  >
                    {" "}
                    {detail === p.id
                      ? "Close details"
                      : "View work details"}{" "}
                    <ArrowUpRight size={16} />
                  </button>
                  {detail === p.id && (
                    <div className="panel-note">
                      <strong>{p.type}</strong>
                      <p>{p.longDescription}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
        </div>
      </>
    );
  if (section === "skills")
    return (
      <>
        <p>
          My technical toolkit: frontend development, backend services,
          databases, cloud infrastructure, and design tools.
        </p>
        <div className="skills-list">
          {skillGroups.map((group) => (
            <article key={group.title}>
              <BookOpen size={20} />
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div className="village-tags">
                {group.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </>
    );
  if (section === "experience" && experiences.length)
    return (
      <div className="career-timeline">
        {experiences.map((entry) => (
          <article key={entry.id}>
            <small>{entry.dates}</small>
            <h3>{entry.position}</h3>
            <strong>{entry.company}</strong>
            <ul>
              {entry.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="village-tags">
              {entry.technologies.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            {entry.outcome && <p>{entry.outcome}</p>}
          </article>
        ))}
      </div>
    );
  if (section === "experience")
    return (
      <div className="empty-history">
        <Mountain size={44} />
        <h3>Every journey has a beginning.</h3>
        <p>
          Professional experience hasn’t been added yet. This hall has room for
          employment, freelance projects, internships, and open-source
          contributions.
        </p>
        <div className="panel-note">
          Explore the Workshop to see my professional work.
        </div>
      </div>
    );
  return (
    <>
      <p>
        Let’s talk about full stack development, backend systems, or a fintech
        opportunity. Reach me by email or phone, or connect through my profiles.
      </p>
      <div className="contact-links">
        {portfolio.email ? (
          <a href={`mailto:${portfolio.email}`}>
            <Mail size={22} />
            <span>
              Email<small>{portfolio.email}</small>
            </span>
            <ArrowUpRight />
          </a>
        ) : (
          <div className="panel-note">
            <Mail size={24} />
            <h3>The mailbox is waiting.</h3>
            <p>
              An email address hasn’t been configured yet. No messages can be
              sent from this portfolio until contact details are added.
            </p>
          </div>
        )}
        <a href={portfolio.phoneHref}>
          <Phone size={22} />
          <span>
            Phone<small>{portfolio.phone}</small>
          </span>
          <ArrowUpRight />
        </a>
        {portfolio.github && (
          <a href={portfolio.github} target="_blank" rel="noopener noreferrer">
            GitHub <ArrowUpRight />
          </a>
        )}
        {portfolio.resumeUrl && (
          <a href={portfolio.resumeUrl} download>
            Download resume (.docx) <ArrowUpRight />
          </a>
        )}
        {portfolio.linkedin && (
          <a
            href={portfolio.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn <ArrowUpRight />
          </a>
        )}
      </div>
    </>
  );
}
export default function Panels() {
  const panel = useGame((s) => s.panel),
    close = useGame((s) => s.close),
    reduced = useGame((s) => s.reduced),
    zoom = useGame((s) => s.zoom),
    view = useGame((s) => s.view),
    volume = useGame((s) => s.volume),
    sound = useGame((s) => s.sound);
  const location = locations.find((l) => l.id === panel);
  const titles =
    panel === "leaderboard"
      ? ["Village leaderboard", "Jungle trial · Hall of runners"]
      : panel === "map"
        ? ["Village map", "Your guide to Forest Village"]
        : panel === "settings"
          ? ["Make yourself at home", "Your adventure, your pace"]
          : [location?.name, location?.subtitle];
  return (
    <Dialog.Root
      open={!!panel}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AnimatePresence>
        {panel && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="panel-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                restoreFocus();
              }}
            >
              <motion.section
                className={`portfolio-panel ${panel === "map" ? "map-panel" : ""}`}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="panel-heading">
                  <Dialog.Close
                    className="panel-close"
                    aria-label="Close panel"
                  >
                    <X size={20} />
                  </Dialog.Close>
                  <span className="panel-eyebrow">FOREST VILLAGE</span>
                  <Dialog.Title>{titles[0]}</Dialog.Title>
                  <Dialog.Description>{titles[1]}</Dialog.Description>
                </div>
                <div className="panel-body">
                  {panel === "leaderboard" ? (
                    <Leaderboard />
                  ) : panel === "map" ? (
                    <VillageMap />
                  ) : panel === "settings" ? (
                    <div className="settings-content">
                      <p className="graphics-note">
                        High graphics · detailed materials, water and shadows
                        always enabled.
                      </p>
                      <label>
                        Camera view
                        <select
                          value={view}
                          onChange={(e) =>
                            useGame.setState({
                              view: e.target.value as typeof view,
                            })
                          }
                        >
                          <option value="birdseye">Bird’s-eye view</option>
                          <option value="first-person">
                            First-person view
                          </option>
                        </select>
                      </label>
                      <label>
                        Camera zoom
                        <input
                          type="range"
                          min={MIN_ZOOM}
                          max={MAX_ZOOM}
                          step=".05"
                          value={zoom}
                          onChange={(e) =>
                            useGame.getState().setZoom(Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Village chill ambience volume
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".05"
                          value={volume}
                          onChange={(e) =>
                            useGame.setState({ volume: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={sound}
                          onChange={(e) =>
                            useGame.setState({ sound: e.target.checked })
                          }
                        />{" "}
                        Village chill ambience · breeze, stream & soft chimes
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={reduced}
                          onChange={(e) =>
                            useGame.setState({ reduced: e.target.checked })
                          }
                        />{" "}
                        Reduce decorative motion
                      </label>
                      <a href="/portfolio">
                        Open the standard portfolio <ArrowUpRight size={16} />
                      </a>
                    </div>
                  ) : (
                    <PortfolioContent key={panel} section={panel} />
                  )}
                </div>
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
