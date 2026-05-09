import { ArrowLeft, Copy, Tag, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const offers = [
  { id: 1, promo: "WELCOME50", title: "Flat 50% Off", max: "₹200", expiry: "Ends in 2 days", desc: "Valid on your first booking" },
  { id: 2, promo: "ACCOOL20", title: "20% Off on AC Services", max: "₹500", expiry: "Valid till 30 April", desc: "Applicable on AC cleaning and repair" },
  { id: 3, promo: "CLEAN15", title: "15% Off Home Cleaning", max: "₹300", expiry: "Ends in 5 days", desc: "Minimum booking of ₹1000 required" },
];

const Offers = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-full flex flex-col bg-[#F5F6FA] pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-[#152E4B]" />
          </button>
          <h1 className="text-xl font-extrabold text-[#030916]">Offers & Promos</h1>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {offers.map(offer => (
          <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
            
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
                  <Tag size={18} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[15px] text-gray-900">{offer.title}</h3>
                  <p className="text-xs text-green-600 font-bold mt-0.5">Up to {offer.max}</p>
                </div>
              </div>
            </div>

            <p className="text-[13px] text-gray-500 mb-4 font-medium leading-relaxed">{offer.desc}</p>
            
            <div className="border border-dashed border-blue-200 rounded-xl p-3 flex justify-between items-center bg-blue-50/50">
              <div>
                <span className="font-extrabold text-[#152E4B] tracking-widest">{offer.promo}</span>
                <p className="text-[10px] text-red-500 font-bold mt-0.5 uppercase tracking-wider">{offer.expiry}</p>
              </div>
              <button 
                onClick={() => copyCode(offer.promo)}
                className="text-blue-600 font-bold text-sm bg-white shadow-sm border border-blue-100 px-4 py-2 rounded-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                {copied === offer.promo ? <><CheckCircle2 size={16} /> COPIED</> : "COPY"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Offers;
