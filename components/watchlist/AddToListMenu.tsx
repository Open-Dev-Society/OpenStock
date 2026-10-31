'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListPlus, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addSymbolToList, createWatchlistList } from '@/lib/actions/watchlist-lists.actions';

// The per-row control in the watchlist table: file this symbol into one of the user's named lists,
// or create the list right here so a first-time user is never stuck on a list-less menu.
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
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

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

    // Create the list and file the symbol in one go. If the add fails the list stays, which is
    // recoverable from the panel above; the error says what happened either way.
    const createAndAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            const created = await createWatchlistList(name);
            if ('error' in created) {
                toast.error(created.error);
                return;
            }
            const added = await addSymbolToList(created.id, symbol, company);
            if ('error' in added) {
                toast.error(added.error);
                return;
            }
            toast.success(`Created “${created.name}” and added ${symbol}`);
            setNaming(false);
            setName('');
            router.refresh();
        } catch {
            toast.error('Couldn’t create the list');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    className="icon-btn"
                    title={`Add ${symbol} to a list`}
                    aria-label={`Add ${symbol} to a named list`}
                >
                    <ListPlus />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[12px] font-normal text-faint">Add to a list</DropdownMenuLabel>
                    {lists.length === 0 ? (
                        <DropdownMenuLabel className="text-[12px] font-normal text-faint">
                            No lists yet — start one below.
                        </DropdownMenuLabel>
                    ) : (
                        lists.map((list) => (
                            <DropdownMenuItem key={list.id} disabled={pending === list.id} onSelect={() => add(list)}>
                                <Star className="size-3.5" />
                                <span className="truncate">{list.name}</span>
                            </DropdownMenuItem>
                        ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setNaming(true)}>
                        <Plus className="size-3.5" />
                        New list…
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={naming} onOpenChange={setNaming}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>New list</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createAndAdd} className="flex flex-col gap-3">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="List name"
                            aria-label="List name"
                            maxLength={60}
                            autoFocus
                            className="h-9 rounded-full bg-page px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setNaming(false)} className="pill h-8">
                                Cancel
                            </button>
                            <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary">
                                <Plus className="size-3.5" /> Create and add
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
