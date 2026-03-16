'use client';

/**
 * PortfolioProjects – displays Roy Otieno's portfolio projects inside the
 * SafariCharge dashboard.
 *
 * Project data is imported from `src/data/portfolioProjects.ts` which is the
 * single source of truth. Any project added there automatically appears here
 * and in the portfolio site (software/portfolio).
 */

import React, { useState } from 'react';
import {
  Zap, Battery, Sun, Leaf, BarChart3, Globe, ExternalLink, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { portfolioProjects, type SharedProject } from '@/data/portfolioProjects';

// ── icon resolution ──────────────────────────────────────────────────────────
const iconMap: Record<string, LucideIcon> = {
  Zap, Battery, Sun, Leaf, BarChart3, Globe,
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Zap;
}

// ── Portfolio URL (update when the portfolio has a fixed deployment URL) ─────
const PORTFOLIO_URL = 'https://v0-personal-projects-lac.vercel.app';

// ── Component ────────────────────────────────────────────────────────────────
export default function PortfolioProjects() {
  const [selected, setSelected] = useState<SharedProject | null>(null);
  const [idx, setIdx] = useState(0);

  const open = (project: SharedProject) => {
    setSelected(project);
    setIdx(portfolioProjects.findIndex((p) => p.id === project.id));
  };

  const close = () => setSelected(null);

  const navigate = (dir: 'prev' | 'next') => {
    const next =
      dir === 'prev'
        ? (idx - 1 + portfolioProjects.length) % portfolioProjects.length
        : (idx + 1) % portfolioProjects.length;
    setIdx(next);
    setSelected(portfolioProjects[next]);
  };

  return (
    <div className="w-full max-w-7xl px-2 pb-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              🗂 Portfolio Projects
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clean-energy & e-mobility projects by Roy Otieno
            </p>
          </div>
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-full transition-colors"
          >
            <ExternalLink size={12} />
            Full Portfolio
          </a>
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {portfolioProjects.map((project) => {
            const Icon = getIcon(project.iconName);
            return (
              <button
                key={project.id}
                onClick={() => open(project)}
                className="group text-left bg-slate-50 hover:bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {/* Icon + badges */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${project.gradient} shadow-sm`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {project.isFounder && (
                      <span className="text-[9px] font-bold bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 px-1.5 py-0.5 rounded-full">
                        Founder
                      </span>
                    )}
                    <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {project.category}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors leading-snug mb-1.5">
                  {project.title}
                </h4>

                {/* Description */}
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (() => {
        const SelectedIcon = getIcon(selected.iconName);
        return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header */}
            <div className={`h-28 bg-gradient-to-br ${selected.gradient} relative`}>
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute bottom-4 left-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <SelectedIcon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs">{selected.category}</p>
                  <h3 className="text-lg font-black text-white leading-tight">{selected.title}</h3>
                </div>
                {selected.isFounder && (
                  <span className="text-[10px] font-bold bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 px-2 py-0.5 rounded-full self-start mt-1">
                    Founder
                  </span>
                )}
              </div>
              <button
                onClick={close}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {selected.role && (
                <p className="text-xs text-amber-500 font-semibold mb-2">{selected.role}</p>
              )}
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {selected.longDescription ?? selected.description}
              </p>

              {/* Specs */}
              {selected.specs && selected.specs.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {selected.specs.map((spec) => (
                    <div key={spec.label} className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
                      <p className="text-base font-bold text-sky-600">{spec.value}</p>
                      <p className="text-[10px] text-slate-400">{spec.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-md bg-sky-50 text-sky-600 border border-sky-100 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer: links + navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  {selected.link && (
                    <a
                      href={selected.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink size={12} />
                      Visit
                    </a>
                  )}
                  <a
                    href={`${PORTFOLIO_URL}/#work`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} />
                    Portfolio
                  </a>
                </div>

                {/* Prev / next */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigate('prev')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft size={16} className="text-slate-600" />
                  </button>
                  <span className="text-xs text-slate-400 font-mono px-1">
                    {idx + 1}/{portfolioProjects.length}
                  </span>
                  <button
                    onClick={() => navigate('next')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
