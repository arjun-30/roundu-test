import { ArrowLeft, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useApp } from "@/context/AppContext";

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useApp();



  return (
    <div className="min-h-full flex flex-col bg-background pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center mr-3 hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Help & Support</h1>
      </div>

      <div className="px-5 pt-6">
        <div className="flex gap-3 mb-8">

          <button 
            onClick={() => navigate("/report-issue")}
            className="flex-1 bg-white rounded-2xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center gap-2 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <AlertCircle size={20} />
            </div>
            <span className="font-extrabold text-[13px] text-foreground">Report Issue</span>
          </button>
        </div>

        <h2 className="text-[17px] font-extrabold text-foreground mb-4 px-1">Frequently Asked Questions</h2>
        
        <div className="bg-white rounded-2xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b border-border px-5">
              <AccordionTrigger className="text-[14px] font-bold text-gray-800 hover:no-underline py-4">How do I cancel my booking?</AccordionTrigger>
              <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                You can cancel your booking from the 'My Bookings' section. Cancellation fees may apply depending on how close it is to the scheduled time according to our cancellation policy.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-b border-border px-5">
              <AccordionTrigger className="text-[14px] font-bold text-gray-800 hover:no-underline py-4">When will I get my refund?</AccordionTrigger>
              <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                Refunds are processed immediately but may take 3-5 business days to reflect in your original payment method. Wallet refunds are instantaneous.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-none px-5">
              <AccordionTrigger className="text-[14px] font-bold text-gray-800 hover:no-underline py-4">Are providers verified?</AccordionTrigger>
              <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                Yes, all our professionals undergo a strict background check and identity verification via DigiLocker before they can accept bookings.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};
export default HelpSupport;
