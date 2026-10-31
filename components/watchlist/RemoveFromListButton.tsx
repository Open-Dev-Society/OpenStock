'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { removeSymbolFromList } from '@/lib/actions/watchlist-lists.actions';

// Takes a symbol out of one named list. It never touches the starred watchlist.
export default function RemoveFromListButton({ listId, listName, symbol }: { listId: string; listName: string; symbol: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const onRemove = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const result = await removeSymbolFromList(listId, symbol);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            toast.success(`${symbol} removed from “${listName}”`);
            router.refresh();
        } catch {
            toast.error('Couldn’t remove the symbol');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="icon-btn is-danger"
            title={`Remove ${symbol} from ${listName}`}
            aria-label={`Remove ${symbol} from ${listName}`}
        >
            <X />
        </button>
    );
}
