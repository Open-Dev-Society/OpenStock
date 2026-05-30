'use client';

import React from 'react';
import { PASSWORD_RULES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

const PasswordRequirements = ({ password }: { password: string }) => {
    return (
        <ul className="space-y-1.5 mt-2">
            {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                    <li key={rule.label} className="flex items-center gap-2 text-xs">
                        {password.length === 0 ? (
                            <span className="size-3.5 rounded-full border border-gray-500" />
                        ) : passed ? (
                            <Check className="size-3.5 text-green-500" />
                        ) : (
                            <X className="size-3.5 text-red-500" />
                        )}
                        <span
                            className={cn(
                                'transition-colors',
                                password.length === 0 && 'text-gray-500',
                                passed ? 'text-green-500' : password.length > 0 && 'text-red-500',
                            )}
                        >
                            {rule.label}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

export default PasswordRequirements;
