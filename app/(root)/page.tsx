import React from 'react'
import {Button} from "../../components/ui/button";

const Home = () => {
    return (
        <div className="flex min-h-screen home-wrapper">
            <div className="flex flex-col items-center justify-center w-full">
                <h1 className="text-4xl font-bold mb-4">Welcome to OpenStock</h1>
                <p className="text-lg mb-8 text-center max-w-2xl">
                    OpenStock is an open-source alternative to expensive market platforms.
                    Track real-time prices, set personalized alerts, and explore detailed company insights.
                </p>
                <Button>Get Started</Button>
            </div>
        </div>
    )
}
export default Home
