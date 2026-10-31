import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { arDigits, type Lang } from "@/lib/i18n";

// Direction is carried by colour and arrow, so it never relies on colour alone.
const ChangePill = ({ value, lang = 'en' }: { value?: number | null; lang?: Lang }) => {
    if (value == null || !Number.isFinite(value)) return <span className="pill">—</span>;
    if (value === 0) return <span className="pill">{arDigits('0.00%', lang)}</span>;
    const up = value > 0;
    return (
        <span className={up ? 'pill is-up' : 'pill is-down'}>
            {up ? <ArrowUpRight /> : <ArrowDownRight />}
            {arDigits(`${Math.abs(value).toFixed(2)}%`, lang)}
        </span>
    );
};

export default ChangePill;
