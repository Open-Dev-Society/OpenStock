import Link from "next/link";

const Footer = () => (
    <footer className="finviz-footer">
        <div className="container finviz-footer-content">
            <div>
                <strong>OpenStock B3</strong>
                <span> · Dados informativos, possivelmente atrasados.</span>
            </div>
            <nav aria-label="Links institucionais">
                <Link href="/about">Sobre</Link>
                <Link href="/help">Ajuda</Link>
                <Link href="/terms">Termos</Link>
            </nav>
            <span>© {new Date().getFullYear()} Open Dev Society</span>
        </div>
    </footer>
 );

export default Footer;
