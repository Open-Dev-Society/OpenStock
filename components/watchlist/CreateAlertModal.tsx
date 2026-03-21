"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner"; // Assuming sonner is available or use existing toast

interface CreateAlertModalProps {
    userId: string;
    symbol: string;
    currentPrice: number;
    companyName?: string; // Optional prop for better display
    onAlertCreated?: () => void;
    children?: React.ReactNode;
    // Controlled props
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function CreateAlertModal({
    userId,
    symbol,
    currentPrice,
    companyName = "",
    onAlertCreated,
    children,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}: CreateAlertModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen : setInternalOpen;

    const [targetPrice, setTargetPrice] = useState<string>(currentPrice.toString());
    const [condition, setCondition] = useState<"ABOVE" | "BELOW">("ABOVE");
    const [alertName, setAlertName] = useState("");
    const [loading, setLoading] = useState(false);

    // Update target price when currentPrice changes (e.g. freshly fetched)
    React.useEffect(() => {
        setTargetPrice(currentPrice.toString());
    }, [currentPrice]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createAlert({
                userId,
                symbol,
                targetPrice: parseFloat(targetPrice),
                condition,
            });
            toast.success("Alert created successfully");
            setOpen?.(false);
            if (onAlertCreated) onAlertCreated();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create alert");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-gray-800 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold tracking-tight text-white mb-2">Price Alert</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 py-2 relative z-10">

                    {/* Alert Name */}
                    <div className="grid gap-2">
                        <Label className="text-gray-400 text-sm font-medium">Alert Name</Label>
                        <Input
                            value={alertName}
                            onChange={(e) => setAlertName(e.target.value)}
                            placeholder="e.g. Apple at Discount"
                            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all rounded-md h-10"
                        />
                    </div>

                    {/* Stock Identifier */}
                    <div className="grid gap-2">
                        <Label className="text-gray-400 text-sm font-medium">Stock identifier</Label>
                        <div className="relative">
                            <Input
                                disabled
                                value={`${companyName || symbol} (${symbol})`}
                                className="bg-[#1C1C1F] border-none text-gray-500 shadow-inner rounded-md h-10"
                            />
                        </div>
                    </div>

                    {/* Alert Type */}
                    <div className="grid gap-2">
                        <Label className="text-gray-400 text-sm font-medium">Alert type</Label>
                        <Select disabled defaultValue="price">
                            <SelectTrigger className="bg-[#1C1C1F] border-gray-800 text-gray-200">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1C1C1F] border-gray-800 text-gray-200">
                                <SelectItem value="price">Price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Condition */}
                    <div className="grid gap-2">
                        <Label className="text-gray-400 text-sm font-medium">Condition</Label>
                        <Select value={condition} onValueChange={(val: any) => setCondition(val)}>
                            <SelectTrigger className="bg-[#1C1C1F] border-gray-800 text-gray-200 hover:border-gray-700 transition-colors">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1C1C1F] border-gray-800 text-gray-200">
                                <SelectItem value="ABOVE">Greater than {">"}</SelectItem>
                                <SelectItem value="BELOW">Less than {"<"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Threshold Value */}
                    <div className="grid gap-2">
                        <Label className="text-gray-400 text-sm font-medium">Threshold value</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500 font-semibold">$</span>
                            <Input
                                type="number"
                                step="0.01"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                                placeholder="eg: 140"
                                className="pl-7 bg-[#1C1C1F] border-gray-800 text-white placeholder:text-gray-600 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all rounded-md h-10 font-mono"
                            />
                        </div>
                    </div>

                    {/* Expiry Note */}
                    <div className="pt-1">
                        <p className="text-xs text-gray-500 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 mr-2"></span>
                            Alert expires automatically in 90 days
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FACC15] hover:bg-[#EAB308] text-black font-bold h-11 text-base transition-all shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                        >
                            {loading ? "Creating Alert..." : "Create Alert"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
