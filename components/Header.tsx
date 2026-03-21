import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";

const Header = async ({ user }: { user: User }) => {
    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/" className="flex items-center justify-center gap-2">
                    <Image src="/assets/images/logo.png" alt="" width={30} height={30}/>
                    <h2 className="text-3xl font-bold text-white">OpenStock</h2>
                </Link>
                <nav className="hidden sm:block">
                    <NavItems/>
                </nav>

                {/* UserDropDown */}
                <UserDropdown user={user}/>
            </div>

        </header>
    )
}
export default Header
