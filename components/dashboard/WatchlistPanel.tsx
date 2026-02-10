'use client';

import { useEffect, useRef } from 'react';
import { X, List } from 'lucide-react';
import Watchlist from './Watchlist';

interface WatchlistPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function WatchlistPanel({ open, onClose }: WatchlistPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Watchlist"
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-border z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <List className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Watchlist</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent/20 transition-colors"
            aria-label="Close watchlist"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="h-[calc(100%-65px)] overflow-y-auto p-4">
          {open && <Watchlist />}
        </div>
      </div>
    </>
  );
}
