'use client';

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { cn } from "@/lib/utils";

type ChoiceChipsProps<T extends FieldValues> = {
    name: Path<T>;
    label: string;
    options: readonly { value: string; label: string }[];
    control: Control<T>;
};

// Single-choice pills for short option lists: every choice is visible and one tap away.
export default function ChoiceChips<T extends FieldValues>({ name, label, options, control }: ChoiceChipsProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <div className="flex flex-col gap-2">
                    <span id={`${name}-label`} className="form-label">{label}</span>
                    <div role="radiogroup" aria-labelledby={`${name}-label`} className="flex flex-wrap gap-1.5">
                        {options.map((option) => {
                            const selected = field.value === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => field.onChange(option.value)}
                                    className={cn(
                                        'h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.96]',
                                        selected
                                            ? 'bg-brand-soft text-brand-ink shadow-[inset_0_0_0_1px_oklch(0.8_0.13_176/0.45)]'
                                            : 'text-muted-foreground shadow-[inset_0_0_0_1px_var(--line)] hover:bg-hover hover:text-foreground',
                                    )}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        />
    );
}
