'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListPlus, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addSymbolToList } from '@/lib/actions/watchlist-lists.actions';

// The per-row control in the watchlist table: file this symbol into one of the user's named lists.
// Lists are created in the panel above, so there is a single creation path.
export default function AddToListMenu({
    symbol,
    company,
    lists,
}: {
    symbol: string;
    company: string;
    lists: { id: string; name: string }[];
}) {
    const router = useRouter();
    const [pending, setPending] = useState<string | null>(null);
    const none = lists.length === 0;

    const add = async (list: { id: string; name: string }) => {
        setPending(list.id);
        try {
            const result = await addSymbolToList(list.id, symbol, company);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            toast.success(`${symbol} added to “${list.name}”`);
            router.refresh();
        } catch {
            toast.error('Couldn’t add the symbol');
        } finally {
            setPending(null);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={none}
                className="icon-btn"
                title={none ? 'Create a list first, in “My lists” above' : `Add ${symbol} to a list`}
                aria-label={none ? 'No lists yet' : `Add ${symbol} to a named list`}
            >
                <ListPlus />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[12px] font-normal text-faint">Add to a list</DropdownMenuLabel>
                {lists.map((list) => (
                    <DropdownMenuItem key={list.id} disabled={pending === list.id} onSelect={() => add(list)}>
                        <Star className="size-3.5" />
                        <span className="truncate">{list.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
