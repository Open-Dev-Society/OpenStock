"use client";

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { Sponsor } from "@/lib/sponsors";
import SponsorPerkModal from "@/components/sponsors/SponsorPerkModal";

type Props = {
    sponsor: Sponsor;
    className?: string;
    style?: CSSProperties;
    title?: string;
    tabIndex?: number;
    children: ReactNode;
};

const isUnmodifiedLeftClick = (event: MouseEvent<HTMLAnchorElement>) =>
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export default function SponsorLink({ sponsor, className, style, title, tabIndex, children }: Props) {
    const [open, setOpen] = useState(false);
    const hasPerk = !!sponsor.perk;

    const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!hasPerk || !isUnmodifiedLeftClick(event)) return;
        event.preventDefault();
        setOpen(true);
    };

    return (
        <>
            <a
                href={sponsor.url}
                target="_blank"
                rel={hasPerk ? "noopener sponsored" : "noreferrer"}
                className={className}
                style={style}
                title={title}
                tabIndex={tabIndex}
                onClick={onClick}
            >
                {children}
            </a>
            {hasPerk && <SponsorPerkModal sponsor={sponsor} open={open} onOpenChange={setOpen} />}
        </>
    );
}
