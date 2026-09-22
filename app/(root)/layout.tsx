import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Layout = ({ children }: { children: React.ReactNode }) => {

    return (
        <main className="finviz-shell">
            <Header />

            <div className="container finviz-content">
                {children}
            </div>

            <Footer />
        </main>
    )
}
export default Layout