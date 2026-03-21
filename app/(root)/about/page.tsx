
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Users,
    Globe,
    Heart,
    Code,
    Github,
    Twitter,
    Linkedin,
    ArrowRight
} from 'lucide-react';

export const metadata = {
    title: 'About Us | OpenStock',
    description: 'The story behind OpenStock and the Open Dev Society.',
};

export default function AboutPage() {
    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            {/* Hero Section */}
            <section className="text-center space-y-8 pt-16 mb-20">
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-2xl border border-teal-500/20 backdrop-blur-sm">
                        <img src="/assets/images/logo.png" alt="Open Dev Society" className="h-10 w-auto" />
                    </div>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight">
                    Tools for Everyone.
                </h1>
                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light">
                    We believe financial intelligence shouldn't be locked behind paywalls.
                    OpenStock is built by the community, for the community.
                </p>
            </section>

            {/* Mission Grid */}
            <section className="grid md:grid-cols-3 gap-6 mb-24">
                <FeatureCard
                    icon={<Globe className="text-blue-400" />}
                    title="Open Access"
                    desc="No premium tiers for core features. Real-time data and insights available to all, forever."
                    color="blue"
                />
                <FeatureCard
                    icon={<Code className="text-purple-400" />}
                    title="Open Source"
                    desc="Fully transparent codebase. Audit our algorithms, contribute features, and build with us."
                    color="purple"
                />
                <FeatureCard
                    icon={<Heart className="text-red-400" />}
                    title="Community Driven"
                    desc="Powered by donations and volunteers. We answer to our users, not shareholders."
                    color="red"
                />
            </section>

            {/* Story Section */}
            <section className="grid md:grid-cols-2 gap-12 items-center mb-24 bg-gray-900/30 p-8 md:p-12 rounded-3xl border border-gray-800">
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-white">The Open Dev Society</h2>
                    <p className="text-gray-400 leading-relaxed text-lg">
                        OpenStock was born from a simple frustration: why are powerful financial tools so expensive?
                    </p>
                    <p className="text-gray-400 leading-relaxed text-lg">
                        We are a collective of developers, designers, and financial enthusiasts working under the <span className="text-teal-400 font-semibold">Open Dev Society</span> banner. Our mission is to democratize software by building high-quality, open-source alternatives to proprietary platforms.
                    </p>
                    <div className="pt-4">
                        <Link href="https://github.com/Open-Dev-Society" target="_blank" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-medium transition-colors group">
                            Visit our GitHub <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
                <div className="relative h-[400px] w-full bg-gradient-to-br from-gray-800 to-black rounded-2xl overflow-hidden border border-gray-700 shadow-2xl group">
                    <Image
                        src="/assets/icons/odslogo.svg"
                        alt="Open Dev Society"
                        fill
                        className="object-contain p-20 opacity-80 group-hover:scale-105 transition-transform duration-700"
                    />
                </div>
            </section>

            {/* Team / Contributors */}
            <section className="text-center mb-20">
                <h2 className="text-3xl font-bold text-white mb-10">Backed by Amazing Partners</h2>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="h-8 w-px bg-gray-700"></div>
                    <Link href="https://www.siray.ai" target="_blank" className="hover:opacity-100 transition-opacity flex items-center gap-2">
                        <img src="/assets/icons/siray.svg" alt="Siray" className="h-6 w-auto invert brightness-0" />
                        <span className="text-xl font-bold text-teal-500">Siray.ai</span>
                    </Link>
                    <div className="h-8 w-px bg-gray-700"></div>
                </div>
            </section>

        </div>
    );
}

function FeatureCard({ icon, title, desc, color }: any) {
    const borders: any = {
        blue: 'hover:border-blue-500/50',
        purple: 'hover:border-purple-500/50',
        red: 'hover:border-red-500/50',
    };

    return (
        <div className={`bg-gray-900/50 border border-gray-800 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${borders[color]}`}>
            <div className="mb-6 p-3 bg-gray-800 w-fit rounded-xl">{icon}</div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed font-light">{desc}</p>
        </div>
    );
}

function SocialButton({ href, icon, label }: any) {
    return (
        <a
            href={href}
            target="_blank"
            className="flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all duration-200 border border-gray-700 hover:border-gray-600 font-medium"
        >
            {icon}
            <span>{label}</span>
        </a>
    );
}
