import React, { useContext } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import { Menu, Search, Sparkles } from '../icons';
import { AuthContext } from '../../contexts/AuthContext';

export const Topbar: React.FC = () => {
    const { activeAccount } = useContext(AuthContext);

    const getInitials = (name: string = "") => {
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'YT';
    };

    return (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="h-14 px-4 lg:px-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden"><Menu/></Button>
                <div className="relative flex-1 max-w-2xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"/>
                    <Input className="pl-9" placeholder="Search videos, projects, comments..."/>
                </div>
                <Button className="gap-2"><Sparkles width={16} height={16}/> Quick Generate</Button>
                <Avatar className="ml-1 size-8">
                    <AvatarFallback>{getInitials(activeAccount?.name)}</AvatarFallback>
                </Avatar>
            </div>
        </div>
    )
}