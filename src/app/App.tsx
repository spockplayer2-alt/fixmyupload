import { useEffect, useState } from 'react';
import { CodeXml, Moon, Sun, ArrowUpRight } from 'lucide-react';
import { Brand } from '../components/Brand';
import { PrivacyDialog } from '../components/PrivacyDialog';
import { Workspace } from '../components/Workspace';
import { useRoute } from '../hooks/useRoute';
import { rootPath, toolForPath, navigate } from './tools';
export default function App() {
  const path = useRoute(),
    tool = toolForPath(path);
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches),
    [privacy, setPrivacy] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    document.title = tool
      ? `${tool.title} — FixMyUpload`
      : 'FixMyUpload — Fix files that websites reject';
    const desc = tool
      ? `${tool.description} Free, private file processing in your browser.`
      : 'Convert, compress, resize, and check your files. Free, private, and entirely in your browser.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = `https://spockplayer2-alt.github.io/fixmyupload/${tool ? `${tool.slug}/` : ''}`;
  }, [tool]);
  const known = !!tool || path === '/' || path === '/fixmyupload/' || path === '/fixmyupload';
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to file tool
      </a>
      <div className="site-shell">
        <header className="site-header">
          <Brand />
          <nav aria-label="Main navigation">
            <a
              className="nav-link"
              href={`${rootPath()}#tools`}
              onClick={(e) => {
                if (tool) {
                  e.preventDefault();
                  navigate();
                  requestAnimationFrame(() => document.getElementById('tools')?.scrollIntoView());
                }
              }}
            >
              Tools
            </a>
            <a
              className="nav-link github-link"
              href="https://github.com/spockplayer2-alt/fixmyupload"
              target="_blank"
              rel="noreferrer"
            >
              <CodeXml size={17} />
              <span>GitHub</span>
              <ArrowUpRight size={13} />
            </a>
            <span className="nav-divider" />
            <button
              className="icon-button"
              aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </header>
        <main id="main">
          {known ? (
            <Workspace key={path} tool={tool} />
          ) : (
            <section className="not-found">
              <h1>This page doesn’t exist.</h1>
              <p>Your files are still on your device.</p>
              <a className="button primary" href={rootPath()}>
                Back to tools
              </a>
            </section>
          )}
        </main>
        <footer className="site-footer">
          <span>Small fixes. Files that fit.</span>
          <div>
            <button className="text-button" onClick={() => setPrivacy(true)}>
              Privacy & limits
            </button>
            <a
              href="https://github.com/spockplayer2-alt/fixmyupload"
              target="_blank"
              rel="noreferrer"
            >
              Open source <ArrowUpRight size={12} />
            </a>
          </div>
          <span className="footer-note">Made for the next upload.</span>
        </footer>
      </div>
      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}
    </>
  );
}
