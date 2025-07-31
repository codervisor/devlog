'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const themes = [
    { name: 'light', label: 'Light', icon: <Sun className="mr-2 h-4 w-4" /> },
    { name: 'dark', label: 'Dark', icon: <Moon className="mr-2 h-4 w-4" /> },
    { name: 'system', label: 'System', icon: <Monitor className="mr-2 h-4 w-4" /> },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ name, label, icon }) => (
          <DropdownMenuItem
            key={name}
            className="cursor-pointer justify-between"
            onClick={() => setTheme(name)}
          >
            <div className="flex items-center">
              {icon}
              <span>{label}</span>
            </div>
            <div>{theme === name && <Check className="h-4 w-4" />}</div>
          </DropdownMenuItem>
        ))}
        {/* Uncomment the following lines if you want to allow users to select themes manually */}
        {/*<DropdownMenuItem className="cursor-pointer" onClick={() => setTheme('light')}>*/}
        {/*  <Sun className="mr-2 h-4 w-4" />*/}
        {/*  <span>Light</span>*/}
        {/*  {theme === 'light' && <Check />}*/}
        {/*</DropdownMenuItem>*/}
        {/*<DropdownMenuItem className="cursor-pointer" onClick={() => setTheme('dark')}>*/}
        {/*  <Moon className="mr-2 h-4 w-4" />*/}
        {/*  <span>Dark</span>*/}
        {/*  {theme === 'dark' && <Check />}*/}
        {/*</DropdownMenuItem>*/}
        {/*<DropdownMenuItem className="cursor-pointer" onClick={() => setTheme('system')}>*/}
        {/*  <Monitor className="mr-2 h-4 w-4" />*/}
        {/*  <span>System</span>*/}
        {/*  {theme === 'system' && <Check />}*/}
        {/*</DropdownMenuItem>*/}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
