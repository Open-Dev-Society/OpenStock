"use client";

import React from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";

interface NewsGridProps {
    news: any[];
}

export default function NewsGrid({ news }: NewsGridProps) {
    if (!news || news.length === 0) return null;

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">Market News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gray-900/30 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors group"
                    >
                        <div className="p-4 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.related ? "bg-blue-900/50 text-blue-300" : "bg-gray-800 text-gray-400"
                                    }`}>
                                    {item.related || "MARKET"}
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-200 mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                                {item.headline}
                            </h3>
                            <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-1">
                                {item.summary}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-600 mt-auto">
                                <span>{item.source}</span>
                                <span>
                                    {item.datetime ? formatDistanceToNow(item.datetime * 1000, { addSuffix: true }) : ''}
                                </span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
