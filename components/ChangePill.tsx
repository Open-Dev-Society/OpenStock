import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// Direction is carried by colour and arrow, so it never relies on colour alone.
const ChangePill = ({ value }: { value?: number | null }) => {
    if (value == null || !Number.isFinite(value)) return <span className="pill">—</span>;
    if (value === 0) return <span className="pill">0.00%</span>;
    const up = value > 0;
    return (
        <span className={up ? 'pill is-up' : 'pill is-down'}>
            {up ? <ArrowUpRight /> : <ArrowDownRight />}
            {Math.abs(value).toFixed(2)}%
        </span>
    );
};

export default ChangePill;
