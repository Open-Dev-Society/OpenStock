import React from 'react'
import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";

const Header = () => {
    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/">
                    <h2 className="text-3xl font-bold text-white">OpenStock</h2>
                </Link>
                <nav className="hidden sm:block">
                    <NavItems/>
                </nav>

                {/* UserDropDown */}
                <UserDropdown/>
            </div>

        </header>
    )
}
export default Header
