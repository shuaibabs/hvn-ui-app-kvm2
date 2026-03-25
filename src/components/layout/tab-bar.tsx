
'use client';

import { useTabs } from '@/context/navigation-context';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

export function TabBar() {
  const { tabs, activeTabId, openTab, closeTab } = useTabs();

  return (
    <div className="border-b bg-background/80 backdrop-blur-sm">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-1 p-1">
                {tabs.map(tab => (
                <Button
                    key={tab.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                    'relative h-9 justify-start gap-2 group',
                    activeTabId === tab.id
                        ? 'bg-muted font-semibold text-foreground'
                        : 'text-muted-foreground'
                    )}
                    onClick={() => openTab(tab.href)}
                >
                    {tab.label}
                    <div
                        role="button"
                        aria-label={`Close tab ${tab.label}`}
                        className={cn(
                            "ml-2 h-4 w-4 rounded-full flex items-center justify-center hover:bg-destructive/20 hover:text-destructive",
                            tabs.length === 1 && "invisible" // Hide close button if it's the last tab
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </div>
                </Button>
                ))}
            </div>
             <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </div>
  );
}
