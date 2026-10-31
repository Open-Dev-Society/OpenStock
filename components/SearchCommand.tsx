"use client"

import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import { ArrowUpRight, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { addSymbolToList } from "@/lib/actions/watchlist-lists.actions";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const OPEN_SEARCH_EVENT = 'open-search';

// One palette is mounted in the app shell, so a request to file results into a named list has to
// travel with the open event rather than through props.
type ListTarget = { id: string; name: string };
let requestedList: ListTarget | null = null;

// Any button can open the one palette mounted in the app shell.
export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

// Opens the same palette in "add to this list" mode: each result gets an Add button and nothing is
// added to the starred watchlist.
export const openSearchForList = (id: string, name: string) => {
    requestedList = { id, name };
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
};

export const SearchButton = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button type="button" onClick={openSearch} className={className}>{children}</button>
);

export default function SearchCommand({ initialStocks }: { initialStocks: StockWithWatchlistStatus[] }) {
    const router = useRouter();
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)
    const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
    // Set only when a named list asked for the palette, so the default behaviour is untouched.
    const [listTarget, setListTarget] = useState<ListTarget | null>(null);
    const [adding, setAdding] = useState<string | null>(null);
    // The palette starts closed, so render it only after hydration (avoids Radix id mismatches)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isSearchMode = !!searchTerm.trim();
    const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setOpen(v => !v)
            }
        }
        const onOpen = () => {
            // Read once, then clear: a later plain open must not keep adding to the old list.
            setListTarget(requestedList);
            requestedList = null;
            setOpen(true);
        }
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener(OPEN_SEARCH_EVENT, onOpen)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener(OPEN_SEARCH_EVENT, onOpen)
        }
    }, [])

    const handleSearch = async () => {
        if(!isSearchMode) return setStocks(initialStocks);

        setLoading(true)
        try {
            const results = await searchStocks(searchTerm.trim());
            setStocks(results);
        } catch {
            setStocks([])
        } finally {
            setLoading(false)
        }
    }

    const debouncedSearch = useDebounce(handleSearch, 300);

    useEffect(() => {
        debouncedSearch();
    }, [debouncedSearch, searchTerm]);

    const handleSelectStock = () => {
        setOpen(false);
        setSearchTerm("");
        setStocks(initialStocks);
    }

    const addToList = async (stock: StockWithWatchlistStatus) => {
        if (!listTarget || adding) return;
        setAdding(stock.symbol);
        try {
            const result = await addSymbolToList(listTarget.id, stock.symbol, stock.name);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            toast.success(`${stock.symbol} added to “${listTarget.name}”`);
            // The palette stays open so several stocks can be filed in one go.
            router.refresh();
        } catch {
            toast.error('Couldn’t add the symbol');
        } finally {
            setAdding(null);
        }
    };

    if (!mounted) return null;

    return (
        <CommandDialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setListTarget(null);
            }}
            className="search-dialog"
        >
            <div className="search-field">
                <CommandInput
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    placeholder={listTarget ? `Add a stock to “${listTarget.name}”` : "Search by company or symbol"}
                    className="search-input"
                />
                {loading && <Loader2 className="search-loader" />}
            </div>
            <CommandList className="search-list">
                {loading ? (
                    <CommandEmpty className="search-list-empty">Searching</CommandEmpty>
                ) : displayStocks?.length === 0 ? (
                    <div className="search-list-indicator">
                        {isSearchMode ? `Nothing matches “${searchTerm.trim()}”` : 'No stocks available'}
                    </div>
                ) : (
                    <ul>
                        <li className="search-count">
                            {listTarget ? <>Adding to <span className="font-semibold">{listTarget.name}</span></> : isSearchMode ? 'Results' : 'Popular'}
                            <span className="num"> · {displayStocks?.length || 0}</span>
                        </li>
                        {displayStocks?.map((stock) => (
                            <li key={stock.symbol} className={cn('search-item', listTarget && 'flex items-center gap-1 pr-2')}>
                                <Link
                                    href={`/stocks/${stock.symbol}`}
                                    onClick={handleSelectStock}
                                    className={cn('search-item-link group', listTarget && 'min-w-0 flex-1')}
                                >
                                    <span className="mono w-20 shrink-0 text-[13px] font-semibold text-brand-ink truncate">{stock.symbol}</span>
                                    <span className="search-item-name flex-1">{stock.name}</span>
                                    <span className="hidden sm:block text-xs text-faint truncate max-w-40">{[stock.exchange, stock.type].filter(Boolean).join(' · ')}</span>
                                    <ArrowUpRight className="size-4 text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                                {listTarget && (
                                    <button
                                        type="button"
                                        onClick={() => addToList(stock)}
                                        disabled={adding !== null}
                                        className="pill h-7 shrink-0"
                                        title={`Add ${stock.symbol} to ${listTarget.name}`}
                                    >
                                        <Plus className="size-3.5" /> {adding === stock.symbol ? 'Adding' : 'Add'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CommandList>
        </CommandDialog>
    )
}
