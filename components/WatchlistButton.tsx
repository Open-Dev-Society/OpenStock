"use client";
import React, { useMemo, useState } from "react";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";

interface WatchlistButtonProps {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    showTrashIcon?: boolean;
    type?: "button" | "icon";
    userId?: string; // 加入自选列表所需的用户 ID
    onWatchlistChange?: (symbol: string, added: boolean) => void;
}

/**
 * 自选列表交互按钮组件
 */
const WatchlistButton = ({
    symbol,
    company,
    isInWatchlist,
    showTrashIcon = false,
    type = "button",
    userId,
    onWatchlistChange,
}: WatchlistButtonProps) => {
    const [added, setAdded] = useState<boolean>(!!isInWatchlist);
    const [loading, setLoading] = useState(false);

    // 动态生成按钮标签
    const label = useMemo(() => {
        if (type === "icon") return added ? "" : "";
        return added ? "从自选列表中移除" : "添加到自选列表";
    }, [added, type]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault(); // 阻止在链接内部时的导航行为

        if (!userId && !onWatchlistChange) {
            console.error("WatchlistButton: requires userId or onWatchlistChange");
            toast.error("请先登录以修改自选列表");
            return;
        }

        const next = !added;
        setAdded(next); // 乐观更新
        setLoading(true);

        try {
            if (userId) {
                if (next) {
                    await addToWatchlist(userId, symbol, company);
                    toast.success(`${symbol} 已加入自选列表`);
                } else {
                    await removeFromWatchlist(userId, symbol);
                    toast.success(`${symbol} 已从自选列表中移除`);
                }
            }

            // 如果提供了外部处理函数（用于刷新 UI），则调用它
            onWatchlistChange?.(symbol, next);
        } catch (error) {
            console.error("Watchlist action failed:", error);
            setAdded(!next); // 出错时回滚
            toast.error("更新自选列表失败");
        } finally {
            setLoading(false);
        }
    };

    // 图标模式 (星星图标)
    if (type === "icon") {
        return (
            <button
                type="button"
                title={added ? `将 ${symbol} 从自选列表中移除` : `将 ${symbol} 添加到自选列表`}
                aria-label={added ? `将 ${symbol} 从自选列表中移除` : `将 ${symbol} 添加到自选列表`}
                className={`flex items-center justify-center p-2 rounded-full transition-all ${added ? "text-yellow-400 hover:bg-yellow-400/10" : "text-gray-400 hover:text-white hover:bg-white/10"} ${loading ? "opacity-50 cursor-wait" : ""}`}
                onClick={handleClick}
                disabled={loading}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={added ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="w-6 h-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
                    />
                </svg>
            </button>
        );
    }

    // 按钮模式
    return (
        <button
            type="button"
            className={`watchlist-btn ${added ? "watchlist-remove" : ""} ${loading ? "opacity-70 cursor-wait" : ""}`}
            onClick={handleClick}
            disabled={loading}
        >
            {showTrashIcon && added ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6" />
                </svg>
            ) : null}
            <span>{loading ? "更新中..." : label}</span>
        </button>
    );
};

export default WatchlistButton;