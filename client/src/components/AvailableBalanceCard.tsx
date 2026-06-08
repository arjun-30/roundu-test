import React from 'react';

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
  const platformFee = walletBalance * 0.15;

  const withdrawableBalance = Math.max(
    0,
    walletBalance - platformFee - commissionDue
  );

  return (
    <div className="w-full bg-slate-900 rounded-[28px] p-6 shadow-xl">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
        WITHDRAWABLE BALANCE
      </p>

      <p className="text-5xl font-extrabold text-white mt-3">
        ₹{withdrawableBalance.toLocaleString('en-IN')}
      </p>

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Wallet Balance</span>
          <span className="font-bold">
            ₹{walletBalance.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex justify-between text-red-300">
          <span>Platform Fee (15%)</span>
          <span className="font-bold">
            ₹{platformFee.toFixed(0)}
          </span>
        </div>

        <div className="flex justify-between text-yellow-300">
          <span>Commission Due</span>
          <span className="font-bold">
            ₹{commissionDue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex justify-between text-slate-300">
          <span>COD Pending Jobs</span>
          <span className="font-bold">
            {codPendingCount}
          </span>
        </div>
      </div>

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