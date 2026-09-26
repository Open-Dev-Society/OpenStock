'use client';

import React, { createContext, useContext, useState } from "react";
import { Github } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signInWithSocial } from "@/lib/actions/auth.actions";

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
);

const PROVIDERS = [
    { id: 'google', label: 'Google', icon: <GoogleIcon /> },
    { id: 'github', label: 'GitHub', icon: <Github className="size-5" /> },
] as const;

type ProviderId = 'google' | 'github';

// The auth layout (a server component) knows which providers have keys and passes them down,
// so pages never offer a button that can only fail.
const EnabledProviders = createContext<ProviderId[]>([]);
export const SocialProvidersProvider = ({ enabled, children }: { enabled: ProviderId[]; children: React.ReactNode }) => (
    <EnabledProviders.Provider value={enabled}>{children}</EnabledProviders.Provider>
);

const SocialAuthButtons = () => {
    const enabled = useContext(EnabledProviders);
    const [pending, setPending] = useState<string | null>(null);
    const providers = PROVIDERS.filter((p) => enabled.includes(p.id));

    const onClick = async (provider: 'google' | 'github') => {
        setPending(provider);
        try {
            const result = await signInWithSocial(provider);
            if (result.success && result.url) {
                window.location.href = result.url;
                return;
            }
            toast.error('Sign in failed', { description: result.error });
        } catch {
            // Network failure or a stale action after a deploy
            toast.error('Sign in failed', { description: 'Check your connection and try again.' });
        }
        setPending(null);
    }

    if (providers.length === 0) return null;

    return (
        <div className="space-y-5 mb-5">
            <div className={providers.length > 1 ? 'grid grid-cols-2 gap-3' : 'grid gap-3'}>
                {providers.map(({ id, label, icon }) => (
                    <Button
                        key={id}
                        type="button"
                        variant="outline"
                        disabled={pending !== null}
                        onClick={() => onClick(id)}
                        className="h-12 border-gray-600 text-gray-400 text-base rounded-lg cursor-pointer"
                    >
                        {icon}
                        {pending === id ? 'Redirecting' : label}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="h-px flex-1 bg-gray-600" />
                or
                <span className="h-px flex-1 bg-gray-600" />
            </div>
        </div>
    );
};
export default SocialAuthButtons;
