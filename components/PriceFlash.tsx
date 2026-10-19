'use client';

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Briefly tints its content up/down when `value` changes, so live updates are noticed without shouting.
const PriceFlash = ({ value, className, children }: { value?: number | null; className?: string; children: React.ReactNode }) => {
    const previous = useRef(value);
    const [direction, setDirection] = useState<'up' | 'down' | null>(null);

    useEffect(() => {
        const before = previous.current;
        previous.current = value;
        if (value == null || before == null || value === before) return;
        setDirection(value > before ? 'up' : 'down');
        const timer = setTimeout(() => setDirection(null), 900);
        return () => clearTimeout(timer);
    }, [value]);

    return <span className={cn(className, direction && `flash-${direction}`)}>{children}</span>;
};

export default PriceFlash;
