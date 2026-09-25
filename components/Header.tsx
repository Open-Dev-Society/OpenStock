import Link from "next/link";
import NavItems from "@/components/NavItems";
import SearchCommand from "@/components/SearchCommand";
import { searchStocks } from "@/lib/actions/finnhub.actions";

const Header = async () => {
    const initialStocks = await searchStocks();

    return (
        <header className="finviz-header">
            <div className="container finviz-header-main">
                <Link href="/" className="finviz-wordmark" aria-label="OpenStock B3">
                    <span>OPEN</span><strong>STOCK</strong><em>B3</em>
                </Link>
                <div className="finviz-header-search">
                    <SearchCommand renderAs="button" label="Buscar ticker" initialStocks={initialStocks} />
                </div>
                <div className="finviz-market-status">
                    <span className="finviz-status-dot" />
                    B3 · DADOS ATIVOS
                </div>
            </div>
            <nav className="finviz-nav" aria-label="Navegação principal">
                <div className="container">
                    <NavItems />
                </div>
            </nav>
        </header>
    );
};

export default Header;