
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";

export default function SirayBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-teal-900/40 to-black border-b border-teal-900/30 px-4 py-2 relative">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                    <Link href="https://www.siray.ai/" target="_blank" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div>
                            {/* Using the copied logo */}
                            <img src="/assets/icons/siray.svg" alt="Siray.ai Logo" className="h-7 w-auto" />
                        </div>
                        <span className="text-teal-100 font-medium tracking-wide">
                            • Reliably backed by <span className="text-[#20c997] font-bold">Siray.ai</span>
                        </span>
                    </Link>
                    <span className="hidden sm:inline text-teal-300/60 text-xs border-l border-teal-800/50 pl-3">
                        Ensuring 100% AI uptime for your market insights
                    </span>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="text-teal-400 hover:text-white transition-colors p-1"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
