import Link from "next/link";
import React from "react";
import Image from "next/image";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/better-auth/auth";

const Layout = async ({ children }: { children : React.ReactNode }) => {

    const session = await auth.api.getSession({headers: await headers()});

    if (session?.user) redirect('/')
    return (
        <main className="auth-layout">
            <section className="auth-left-section scrollbar-hide-default">
                <Link href="/" className="auth-logo flex items-center gap-2">
                    <Image src="/assets/images/logo.png" alt="Openstock" width={200} height={50}/>
                </Link>

                <div className="pb-6 lg:pb-8 flex-1">
                    {children}
                </div>
            </section>
            <section className="auth-right-section">
                <div className="z-10 relative lg:mt-4 lg:mb-16">
                    <blockquote className="auth-blockquote">
                        “For me, OpenStock isn’t just another stock app. It’s about giving people clarity and control in the market, without barriers or subscriptions.”
                    </blockquote>
                    <div className="flex items-center justify-between">
                        <div>
                            <cite className="auth-testimonial-author">- Ravi Pratap Singh (@ravixalgorithm)</cite>
                            <p className="max-md:text-xs text-gray-500">Founder @opendevsociety</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map((star) => (
                                <Image src="/assets/icons/star.svg" alt="star" key={star} width={20} height={20} className="w-4 h-4"/>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 relative">
                    <Image src="/assets/images/dashboard.png" alt="Dashboard Preview" width={1440} height={1150} className="auth-dashboard-preview absolute top-0" />
                </div>
            </section>

        </main>
    )
}
export default Layout
