'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import NavItems from "@/components/NavItems";
import { signOut } from "@/lib/actions/auth.actions";

/**
 * 用户下拉菜单组件
 * 用于展示用户信息和退出登录入口
 */
const UserDropdown = ({ user, initialStocks }: { user: User, initialStocks: StockWithWatchlistStatus[] }) => {
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push("/sign-in");
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-3 text-gray-4 hover:bg-gray-800 bg-gray-800">
                    <Avatar className="h-8 w-8">
                        {/* 用户头像 - 使用 Philosophy AI logo 作为默认 */}
                        <AvatarImage src="https://media.licdn.com/dms/image/v2/D560BAQGHApE1Vtq6DA/company-logo_200_200/B56ZY1OFJOGcAI-/0/1744649609317/philosopai_in_logo?e=1761782400&v=beta&t=uLNK6v7h96sXybdT42cVK0cJSZaA8KVLw8JYO5fY4oQ" />
                        <AvatarFallback className="bg-teal-500 text-teal-900 text-sm font-bold">
                            {user.name[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start ">
                        <span className='text-base font-medium text-gray-400 hover:text-teal-500 '>
                            {user.name}
                        </span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-gray-400 bg-gray-800 relative right-5">
                <DropdownMenuLabel>
                    <div className="flex relative items-center gap-3 py-2">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src="https://media.licdn.com/dms/image/v2/D560BAQGHApE1Vtq6DA/company-logo_200_200/B56ZY1OFJOGcAI-/0/1744649609317/philosopai_in_logo?e=1761782400&v=beta&t=uLNK6v7h96sXybdT42cVK0cJSZaA8KVLw8JYO5fY4oQ" />
                            <AvatarFallback className="bg-teal-500 text-yellow-900 text-sm font-bold">
                                {user.name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className='text-base font-medium text-gray-400'>
                                {user.name}
                            </span>
                            <span className="text-sm text-gray-500">{user.email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-600" />
                <DropdownMenuItem onClick={handleSignOut} className="text-gray-100 text-md font-medium focus:bg-transparent focus:text-teal-500 transition-colors cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2 hidden sm:block" />
                    退出登录
                </DropdownMenuItem>
                <DropdownMenuSeparator className="block sm:hidden bg-gray-600" />
                {/* 移动端显示的导航菜单 */}
                <nav className="sm:hidden">
                    <NavItems initialStocks={initialStocks} />
                </nav>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
export default UserDropdown
