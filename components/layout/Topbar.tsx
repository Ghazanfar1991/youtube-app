import React, { useContext } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import { Menu, Search, Sparkles } from '../icons';
import { AuthContext } from '../../contexts/AuthContext';

export const Topbar: React.FC = () => {
    const { activeAccount } = useContext(AuthContext);

    const getInitials = (name: string = '') => {
        return (
            name
                .trim()
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'YT'
        );
    };

    const initials = getInitials(activeAccount?.name);

    return (
        <>
            <header className="sticky top-0 z-20 hidden border-b bg-white/80 backdrop-blur md:block">
                <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
                    <div className="relative flex-1 max-w-2xl">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <Input className="pl-9" placeholder="Search videos, projects, comments..." />
                    </div>
                    <Button className="gap-2" type="button">
                        <Sparkles width={16} height={16} />
                        Quick Generate
                    </Button>
                    <Avatar className="ml-1 size-8">
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/90 backdrop-blur md:hidden">
                <div className="flex h-16 items-center justify-around px-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label="Open menu"
                        className="rounded-full"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label="Search"
                        className="rounded-full"
                    >
                        <Search className="h-6 w-6" />
                    </Button>
                    <Button
                        type="button"
                        className="flex min-w-[88px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs font-medium"
                    >
                        <Sparkles width={20} height={20} />
                        <span>Generate</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label="Account"
                        className="rounded-full p-0"
                    >
                        <Avatar className="size-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                    </Button>
                </div>
            </nav>
        </>
    );
};
