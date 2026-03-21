'use client';

import { useCallback, useRef } from 'react';

export function useDebounce(callback: () => void, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref up to date
    callbackRef.current = callback;

    return useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => callbackRef.current(), delay);
    }, [delay])
}