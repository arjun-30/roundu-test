import React from 'react';
import { Wallet } from 'lucide-react';

interface AvailableBalanceCardProps {
  walletBalance: number;
  commissionDue: number;
  codPendingCount: number;
  onWithdraw: () => void;
}

const AvailableBalanceCard: React.FC<AvailableBalanceCardProps> = ({
  walletBalance,
  commissionDue,
  codPendingCount,
  onWithdraw,
}) => {


  return (
    <div className="w-full bg-slate-900 rounded-[28px] p-6 shadow-xl">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
        AVAILABLE BALANCE
      </p>

      <p className="text-5xl font-extrabold text-white mt-3">
        ₹{walletBalance.toLocaleString('en-IN')}
      </p>

      <button
        onClick={onWithdraw}
        className="w-full mt-8 py-4 rounded-2xl bg-primary text-white font-extrabold text-lg"
      >
        Withdraw to Bank
      </button>
    </div>
  );
};

export default AvailableBalanceCard;
