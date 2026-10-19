'use server';

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/better-auth/auth";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";

export type ProfileInput = {
    name: string;
    country: string;
    investmentGoals: string;
    riskTolerance: string;
    preferredIndustry: string;
};

const isOption = (options: readonly { value: string }[], value: string) => options.some((o) => o.value === value);

// Every call acts on the signed-in user's own session; nothing here takes a user id from the client.
export async function updateProfile(input: ProfileInput) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) return { success: false, error: 'Name must be 2 to 80 characters.' };
    if (!/^[A-Z]{2}$/.test(input.country)) return { success: false, error: 'Pick a country.' };
    if (!isOption(INVESTMENT_GOALS, input.investmentGoals)
        || !isOption(RISK_TOLERANCE_OPTIONS, input.riskTolerance)
        || !isOption(PREFERRED_INDUSTRIES, input.preferredIndustry)) {
        return { success: false, error: 'Pick one option in each group.' };
    }

    try {
        await auth.api.updateUser({
            headers: await headers(),
            body: {
                name,
                country: input.country,
                investmentGoals: input.investmentGoals,
                riskTolerance: input.riskTolerance,
                preferredIndustry: input.preferredIndustry,
            },
        });
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e) {
        console.error('Profile update failed', e);
        return { success: false, error: 'Couldn’t save your profile.' };
    }
}

export async function changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
    try {
        await auth.api.changePassword({
            headers: await headers(),
            body: { currentPassword, newPassword, revokeOtherSessions: true },
        });
        return { success: true };
    } catch (e) {
        console.error('Password change failed', e);
        return { success: false, error: 'Current password is incorrect, or the new one is too short.' };
    }
}
