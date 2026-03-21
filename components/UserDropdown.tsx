'use client';


import {Button} from "@/components/ui/button";
import React from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {useRouter} from "next/navigation";
import {LogOut} from "lucide-react";
import {NAV_ITEMS} from "@/lib/constants";
import NavItems from "@/components/NavItems";

const UserDropdown = () => {
    const router = useRouter();

    const handleSignOut = async() => {
        router.push("/sign-in");
    }

    const user = {
        name: "ODS",
        email: "opendevsociety@cc.cc",
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 text-gray-400 hover:text-yellow-500">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://media.licdn.com/dms/image/v2/D560BAQGHApE1Vtq6DA/company-logo_200_200/B56ZY1OFJOGcAI-/0/1744649609317/philosopai_in_logo?e=1761782400&v=beta&t=uLNK6v7h96sXybdT42cVK0cJSZaA8KVLw8JYO5fY4oQ" />
                        <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                            {user.name[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                        <span className="text-base font-medium text-gray-400">
                            {user.name}
                        </span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-gray-400">
                <DropdownMenuLabel>
                    <div className="flex relative items-center gap-3 py-2">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src="https://media.licdn.com/dms/image/v2/D560BAQGHApE1Vtq6DA/company-logo_200_200/B56ZY1OFJOGcAI-/0/1744649609317/philosopai_in_logo?e=1761782400&v=beta&t=uLNK6v7h96sXybdT42cVK0cJSZaA8KVLw8JYO5fY4oQ" />
                            <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                                {user.name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                        <span className="text-base font-medium text-gray-400">
                            {user.name}
                        </span>
                            <span className="text-sm text-gray-500">
                            {user.email}
                        </span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-600"/>
                <DropdownMenuItem onClick={handleSignOut} className="text-gray-100 text-md font-medium focus:bg-transparent focus:text-yellow-500 transition-colors cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2 hidden sm:block"/>
                    Logout
                </DropdownMenuItem>
                <DropdownMenuSeparator className=" hidden sm:block bg-gray-600"/>
                <nav className="sm:hidden">
                    <NavItems/>
                </nav>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
export default UserDropdown
