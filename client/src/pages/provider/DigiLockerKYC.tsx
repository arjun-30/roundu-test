import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ShieldCheck, CheckCircle2, ChevronDown, Building2, Camera, Loader2, Landmark, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

// Verhoeff algorithm tables for Aadhaar validation
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

function validateVerhoeff(num: string) {
  let c = 0;
  const myArray = num.split('').reverse().map(Number);
  for (let i = 0; i < myArray.length; i++) {
    c = d[c][p[i % 8][myArray[i]]];
  }
  return c === 0;
}

const DigiLockerKYC = () => {
  const navigate = useNavigate();
  const { user, providerRegistrationDraft, dispatch } = useApp();
  const { kyc } = providerRegistrationDraft;

  const [activeStep, setActiveStep] = useState<number>(kyc.aadhaarVerified ? 2 : 1);

  // Aadhaar State
  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState(["", "", "", "", "", ""]);
  const [showAadhaarOtp, setShowAadhaarOtp] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Bank & PAN State
  const [accName, setAccName] = useState(user.name);
  const [accNum, setAccNum] = useState('');
  const [accNumConfirm, setAccNumConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [pan, setPan] = useState('');
  const [isScanningPan, setIsScanningPan] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);

  useEffect(() => {
    if (showAadhaarOtp) {
      otpRefs.current[0]?.focus();
    }
  }, [showAadhaarOtp]);

  const handleSendAadhaarOtp = () => {
    if (!/^[2-9]{1}[0-9]{11}$/.test(aadhaar)) {
      toast.error('Invalid Aadhaar format. It must be 12 digits and cannot start with 0 or 1.');
      return;
    }
    if (!validateVerhoeff(aadhaar)) {
      toast.error('Entered Aadhaar number is invalid. Check and try again.');
      return;
    }
    toast.success('OTP sent to Aadhaar linked mobile');
    setShowAadhaarOtp(true);
    setAadhaarOtp(["", "", "", "", "", ""]);
  };

  const handleOtpChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...aadhaarOtp];
    next[i] = digit;
    setAadhaarOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !aadhaarOtp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "Enter" && aadhaarOtp.join("").length === 6) verifyAadhaar();
  };

  const verifyAadhaar = () => {
    if (aadhaarOtp.join("").length < 6) {
      toast.error('Enter valid 6-digit OTP');
      return;
    }
    dispatch({ type: 'UPDATE_KYC', patch: { aadhaarVerified: true } });
    toast.success('Aadhaar Verified Successfully');
    setShowAadhaarOtp(false);
    setActiveStep(2);
  };

  const verifyBank = () => {
    if (!/^[a-zA-Z\s]+$/.test(accName)) {
      toast.error('Enter a valid Account Holder Name (only alphabets)');
      return;
    }
    if (!/^\d{9,18}$/.test(accNum)) {
      toast.error('Invalid Bank Account. Must be numeric and between 9 to 18 digits.');
      return;
    }
    if (accNum !== accNumConfirm) {
      toast.error('Account numbers do not match');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      toast.error('Invalid IFSC Code. Example: SBIN0003994 (4 letters, 0, 6 alphanumeric characters)');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      toast.error('Invalid PAN format. Example: ABCDE1234F (5 letters, 4 numbers, 1 letter)');
      return;
    }

    dispatch({ type: 'UPDATE_KYC', patch: { bankVerified: true, panVerified: true } });
    toast.success('Bank Account & PAN Verified Successfully');
  };

  const scanPan = () => {
    setIsScanningPan(true);
    toast.info("Accessing camera...");
    setTimeout(() => {
      setIsScanningPan(false);
      setPan("ABCDE1234F");
      toast.success("PAN details extracted via OCR!");
    }, 2500);
  };

  const verifyBankWithAnimation = () => {
    if (!accNum || !ifsc) {
      toast.error("Enter bank details first");
      return;
    }
    setIsVerifyingBank(true);
    toast.info("Sending ₹1 micro-deposit for verification...");
    setTimeout(() => {
      setIsVerifyingBank(false);
      verifyBank();
    }, 3000);
  };

  const allVerified = kyc.aadhaarVerified && kyc.bankVerified;

  const handleNext = () => {
    navigate('/provider/video-portfolio');
  };

  if (showAadhaarOtp && !kyc.aadhaarVerified) {
    return (
      <div className="min-h-full flex flex-col px-6 py-8 bg-background">
        <button
          onClick={() => setShowAadhaarOtp(false)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="mt-10 mb-8 animate-fade-in">
          <h1 className="text-3xl font-extrabold text-foreground leading-tight">Verify your Aadhaar</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            We sent a 6-digit code to your Aadhaar linked mobile
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-6 animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
          {aadhaarOtp.map((d, i) => (
            <input
              key={i}
              ref={(el) => (otpRefs.current[i] = el)}
              value={d}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-12 h-14 text-center text-2xl font-extrabold rounded-2xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mb-6">
          Didn't get a code? <button className="font-semibold text-primary">Resend</button>
        </p>

        <button
          onClick={verifyAadhaar}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-secondary active:scale-[0.98] transition-all"
        >
          Verify & Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card border-b border-border shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft size={22} className="text-foreground" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground mx-auto flex items-center justify-center gap-2">
          Verify Identity <ShieldCheck size={18} className="text-success" />
        </h1>
        <span className="text-xs font-semibold text-muted-foreground mr-1">Step 3 of 6</span>
      </div>

      <div className="flex-1 p-5 pb-28 space-y-5 overflow-y-auto">
        <div className="mb-2 animate-fade-in text-center space-y-4">
          <div className="bg-[#003876] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck size={32} className="text-[#003876]" />
              </div>
              <h2 className="text-lg font-bold">DigiLocker Account</h2>
              <p className="text-xs text-white/70 max-w-[200px] leading-relaxed">
                Fast & secure identity verification for service providers
              </p>
              <button 
                onClick={() => {
                  toast.info("Connecting to DigiLocker...");
                  setTimeout(() => {
                    toast.success("DigiLocker linked successfully!");
                  }, 1500);
                }}
                className="mt-2 w-full py-3 bg-white text-[#003876] font-extrabold text-sm rounded-xl hover:bg-gray-100 transition-colors shadow-lg active:scale-95"
              >
                Connect DigiLocker
              </button>
            </div>
          </div>

          <p className="text-[13px] text-muted-foreground leading-relaxed px-4 font-medium">
            We use DigiLocker to instantly verify your identity and bank details. Your data is encrypted and secure.
          </p>
        </div>

        {/* STEP 1: AADHAAR */}
        <div className={`rounded-2xl border transition-all duration-300 ${activeStep === 1 ? 'bg-card border-primary ring-1 ring-primary/20 shadow-md' : 'bg-muted/30 border-border'}`}>
          <div
            onClick={() => setActiveStep(1)}
            className="p-4 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${kyc.aadhaarVerified ? 'bg-success text-success-foreground' : (activeStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}`}>
                {kyc.aadhaarVerified ? <CheckCircle2 size={16} /> : '1'}
              </div>
              <div>
                <h3 className={`font-bold ${activeStep === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Aadhaar Verification</h3>
                {kyc.aadhaarVerified && <p className="text-[11px] text-success font-semibold">Verified successfully</p>}
              </div>
            </div>
            {!kyc.aadhaarVerified && <ChevronDown size={20} className={activeStep === 1 ? 'rotate-180 transition-transform text-foreground' : 'text-muted-foreground'} />}
          </div>

          {activeStep === 1 && !kyc.aadhaarVerified && (
            <div className="p-4 pt-0 border-t border-border animate-fade-in-up">
              <p className="text-xs text-muted-foreground mb-3">Enter your 12-digit Aadhaar number to fetch details via DigiLocker.</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                placeholder="Aadhaar Number *"
                value={aadhaar}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val) && val.length <= 12) setAadhaar(val);
                }}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground mb-3"
              />
              <button
                onClick={handleSendAadhaarOtp}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all"
              >
                Send OTP
              </button>
            </div>
          )}
        </div>

        {/* STEP 2: BANK & PAN DETAILS */}
        {kyc.aadhaarVerified && (
          <div className={`rounded-2xl border transition-all duration-300 ${activeStep === 2 ? 'bg-card border-primary ring-1 ring-primary/20 shadow-md' : 'bg-muted/30 border-border'}`}>
            <div
              onClick={() => setActiveStep(2)}
              className="p-4 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${kyc.bankVerified && kyc.panVerified ? 'bg-success text-success-foreground' : (activeStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}`}>
                  {kyc.bankVerified && kyc.panVerified ? <CheckCircle2 size={16} /> : '2'}
                </div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${activeStep === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Bank & PAN Details</h3>
                  <Building2 size={14} className="text-muted-foreground" />
                </div>
              </div>
              {!(kyc.bankVerified && kyc.panVerified) && <ChevronDown size={20} className={activeStep === 2 ? 'rotate-180 transition-transform text-foreground' : 'text-muted-foreground'} />}
            </div>

            {activeStep === 2 && !(kyc.bankVerified && kyc.panVerified) && (
              <div className="p-4 pt-0 border-t border-border animate-fade-in-up">
                <p className="text-xs text-muted-foreground mb-3">Where should we send your earnings?</p>

                <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Account Holder Name *"
                    value={accName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[a-zA-Z\s]*$/.test(val)) setAccName(val);
                    }}
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
                  />

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="PAN Number *"
                      value={pan}
                      maxLength={10}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      className="w-full bg-background border border-border rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-primary text-foreground uppercase"
                    />
                    <button
                      onClick={scanPan}
                      disabled={isScanningPan}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary active:scale-90 transition-transform disabled:opacity-50"
                    >
                      {isScanningPan ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Bank Account Number *"
                      value={accNum}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) setAccNum(val);
                      }}
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Confirm Account Number *"
                      value={accNumConfirm}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) setAccNumConfirm(val);
                      }}
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="IFSC Code *"
                    value={ifsc}
                    maxLength={11}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground uppercase"
                  />
                </div>

                <button
                  onClick={verifyBankWithAnimation}
                  disabled={isVerifyingBank}
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isVerifyingBank ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Verifying Details...
                    </>
                  ) : (
                    <>
                      <Landmark size={18} /> Verify & Link Details
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Continue button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent pointer-events-none flex flex-col gap-2">
        {/* TODO: Rollback this bypass function. Remove the Autofill button below in production. */}
        <button
          onClick={() => {
            setAadhaar('202604241536');
            setAccNum('1735155000065034');
            setAccNumConfirm('1735155000065034');
            setIfsc('SBIN0003994');
            setPan('ABCDE1234F');
            dispatch({ type: 'UPDATE_KYC', patch: { aadhaarVerified: true, bankVerified: true, panVerified: true } });
            toast.success('Autofilled and bypassed validations (Demo Only)');
          }}
          className="pointer-events-auto text-xs font-bold text-primary underline mx-auto hover:text-primary/80 transition-colors"
        >
          Autofill (Demo Only)
        </button>
        <button
          onClick={handleNext}
          disabled={!allVerified}
          className={`w-full max-w-[390px] mx-auto pointer-events-auto flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg ${allVerified
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 shadow-none'
            }`}
        >
          <span className="text-[15px] font-bold">Continue to Portfolio</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default DigiLockerKYC;
