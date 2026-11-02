import {
  ArrowRight,
  Crop,
  FileImage,
  FileStack,
  ImageDown,
  Images,
  RefreshCw,
  Scaling,
  Scissors,
  Shield,
  RotateCw,
  FileMinus,
  ListOrdered,
  Files,
} from 'lucide-react';
import { tools, rootPath, type Tool } from '../app/tools';
const icons = [
  ImageDown,
  Scaling,
  RefreshCw,
  Crop,
  Shield,
  Images,
  ImageDown,
  FileStack,
  Scissors,
  Files,
  FileMinus,
  ListOrdered,
  RotateCw,
  FileImage,
];
export function ToolBrowser({
  onSelect,
  category,
  onCategory,
}: {
  onSelect: (tool: Tool) => void;
  category: 'image' | 'pdf';
  onCategory: (c: 'image' | 'pdf') => void;
}) {
  return (
    <section className="tool-browser" id="tools" aria-labelledby="tools-title">
      <div className="tools-heading">
        <h2 id="tools-title">A tool for every upload.</h2>
        <div className="segmented" role="tablist" aria-label="Tool categories">
          <button
            role="tab"
            aria-selected={category === 'image'}
            onClick={() => onCategory('image')}
          >
            Images
          </button>
          <button role="tab" aria-selected={category === 'pdf'} onClick={() => onCategory('pdf')}>
            PDF tools
          </button>
        </div>
      </div>
      <div className="tools-grid">
        {tools.map((tool, i) => {
          const Icon = icons[i];
          return (
            tool.category === category && (
              <a
                className="tool-link"
                href={`${rootPath()}${tool.slug}/`}
                key={tool.slug}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(tool);
                }}
              >
                <span className="tool-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{tool.title}</strong>
                  <span>{tool.description}</span>
                </span>
                <ArrowRight size={16} className="tool-arrow" />
              </a>
            )
          );
        })}
      </div>
    </section>
  );
}
