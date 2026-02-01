'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Search, Home, Moon, Sun, Keyboard, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Open command palette with Cmd/Ctrl+K, shortcuts with ?, Escape to close
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Cmd/Ctrl+K - Open command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
        return;
      }
      
      // ? - Show shortcuts (only if not typing)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !isInput) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
      
      // Escape - Close modals/clear search
      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(false);
        } else if (showShortcuts) {
          e.preventDefault();
          setShowShortcuts(false);
        } else if (isInput && (target as HTMLInputElement).value) {
          // Clear search input if it has text
          (target as HTMLInputElement).value = '';
          (target as HTMLInputElement).blur();
        }
        return;
      }
      
      // Global shortcuts (only if not typing in input)
      if (!isInput) {
        // Cmd/Ctrl+S - Focus stock search
        if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (open) setOpen(false);
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder*="Search stocks"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              toast.success('Stock search focused');
            } else {
              toast.info('Navigate to dashboard to search stocks');
            }
          }, 100);
          return;
        }
        
        // Cmd/Ctrl+G - Go to dashboard
        if (e.key === 'g' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (open) setOpen(false);
          router.push('/');
          toast.success('Navigated to dashboard');
          return;
        }
        
        // Cmd/Ctrl+T - Toggle theme
        if (e.key === 't' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (open) setOpen(false);
          setTheme(theme === 'dark' ? 'light' : 'dark');
          toast.success(`Switched to ${theme === 'dark' ? 'light' : 'dark'} mode`);
          return;
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, showShortcuts, theme, setTheme, router]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => {
                router.push('/');
                toast.success('Navigated to dashboard');
              })}
            >
              <Home className="mr-2 h-4 w-4" />
              <span>Go to Dashboard</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>G
              </kbd>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => runCommand(() => {
                // Focus the stock search input
                const searchInput = document.querySelector('input[placeholder*="Search stocks"]') as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                  toast.success('Stock search focused');
                } else {
                  toast.info('Navigate to dashboard to search stocks');
                }
              })}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search Stocks</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>S
              </kbd>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => {
                setTheme(theme === 'dark' ? 'light' : 'dark');
                toast.success(`Switched to ${theme === 'dark' ? 'light' : 'dark'} mode`);
              })}
            >
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              <span>Toggle Theme</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>T
              </kbd>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => {
                setOpen(false);
                setShowShortcuts(true);
              })}
            >
              <Keyboard className="mr-2 h-4 w-4" />
              <span>Show Keyboard Shortcuts</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                ?
              </kbd>
            </CommandItem>
          </CommandGroup>

          {pathname.startsWith('/stock/') && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Stock Page">
                <CommandItem
                  onSelect={() => runCommand(() => {
                    router.push('/');
                    toast.success('Returned to dashboard');
                  })}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>Back to Dashboard</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>

      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
    </>
  );
}

function KeyboardShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { keys: [`${modKey}`, 'K'], description: 'Open command palette' },
    { keys: [`${modKey}`, 'S'], description: 'Focus stock search' },
    { keys: [`${modKey}`, 'G'], description: 'Go to dashboard' },
    { keys: [`${modKey}`, 'T'], description: 'Toggle theme' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modals / Clear search' },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandList>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex}>
                      <kbd className="inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="mx-1 text-muted-foreground">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
            Press <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">Esc</kbd> to close
          </p>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
