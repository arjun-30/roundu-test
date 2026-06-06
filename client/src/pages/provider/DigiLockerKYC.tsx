import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronRight, ShieldCheck, CheckCircle2, ChevronDown, Building2, Loader2, Landmark } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DigiLockerKYC = () => {
  const navigate = useNavigate();
  const { user, providerRegistrationDraft, dispatch } = useApp();
  const { kyc } = providerRegistrationDraft;

  const [activeStep, setActiveStep] = useState<number>(kyc.aadhaarVerified ? 2 : 1);

  // Bank & PAN State
  const [accName, setAccName] = useState(user.name);
  const [accNum, setAccNum] = useState('');
  const [accNumConfirm, setAccNumConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [pan, setPan] = useState('');
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [notification, setNotification] = useState("");
  const [error, setError] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const getToken = () => localStorage.getItem("roundu_token") || "";

  useEffect(() => {
    const checkPendingAadhaar = async () => {
      const pendingReqId = localStorage.getItem('cf_aadhaar_verification_id');
      if (pendingReqId && !kyc.aadhaarVerified) {
        setIsVerifyingAadhaar(true);
        try {
          const res = await axios.post(`${API_URL}/kyc/aadhaar/verify`, { requestId: pendingReqId }, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });

          if (res.data.success && res.data.data?.verified) {
            dispatch({ type: 'UPDATE_KYC', patch: { aadhaarVerified: true } });
            showNotification('Aadhaar Verified Successfully');
            setActiveStep(2);
            localStorage.removeItem('cf_aadhaar_verification_id');
          } else {
            if (res.data.data?.status === 'AADHAAR_NOT_LINKED') {
              showError(res.data.data?.message || 'Aadhaar not linked in DigiLocker.');
            } else {
              showError(res.data.data?.message || 'Aadhaar verification failed. Please try again.');
            }
            localStorage.removeItem('cf_aadhaar_verification_id');
          }
        } catch (err: any) {
          showError(err.response?.data?.message || 'Failed to verify Aadhaar status');
          localStorage.removeItem('cf_aadhaar_verification_id');
        } finally {
          setIsVerifyingAadhaar(false);
        }
      }
    };

    checkPendingAadhaar();
  }, [kyc.aadhaarVerified, dispatch]);

  const handleConnectDigiLocker = async () => {
    setIsConnecting(true);
    try {
      const res = await axios.post(`${API_URL}/kyc/aadhaar/init`, {
        clientRedirectUrl: window.location.href
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (res.data.success && res.data.data) {
        const { id, url } = res.data.data;
        localStorage.setItem('cf_aadhaar_verification_id', id);
        window.location.href = url; // Redirect to Cashfree/DigiLocker
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to initiate DigiLocker. Please try again.');
      setIsConnecting(false);
    }
  };

  const verifyBankAndPan = async () => {
    if (!accNum || accNum !== accNumConfirm || !ifsc || !pan) {
      showError("Enter valid bank and PAN details");
      return;
    }
    setIsVerifyingBank(true);

    try {
      // 1. Verify PAN
      const panRes = await axios.post(`${API_URL}/kyc/pan/verify`, { pan }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (!panRes.data.success || !panRes.data.data?.verified) {
        showError(panRes.data.data?.message || panRes.data.message || 'PAN Verification Failed');
        setIsVerifyingBank(false);
        return;
      }

      if (panRes.data.data?.warningMessage) {
        showNotification(panRes.data.data.warningMessage);
      }

      dispatch({ type: 'UPDATE_KYC', patch: { panVerified: true } });

      // 2. Verify Bank
      const bankInitRes = await axios.post(`${API_URL}/kyc/bav/init`, {
        accountNumber: accNum,
        ifsc
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (bankInitRes.data.success && bankInitRes.data.data?.requestId) {
        const reqId = bankInitRes.data.data.requestId;

        // Check Status
        const bankStatusRes = await axios.get(`${API_URL}/kyc/bav/${reqId}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });

        if (bankStatusRes.data.success && bankStatusRes.data.data?.verified) {
          dispatch({ type: 'UPDATE_KYC', patch: { bankVerified: true } });
          showNotification('Bank Account & PAN Verified Successfully');
        } else {
          showError(bankStatusRes.data.data?.message || bankStatusRes.data.message || 'Bank verification failed');
        }
      } else if (bankInitRes.data.queued) {
        showNotification(bankInitRes.data.message || 'Bank verification queued.');
        dispatch({ type: 'UPDATE_KYC', patch: { bankVerified: true } });
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Verification failed. Please try again.';
      showError(msg);

      if (status === 429 || status === 403) {
        // Handle 429 locks and 403 fraud flags naturally
      }
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const allVerified = kyc.aadhaarVerified && kyc.bankVerified;

  const handleNext = () => {
    navigate('/provider/video-portfolio');
  };

  /* =====================================================================
     DEV ONLY: AUTO FILL FUNCTION
     HOW TO REMOVE BEFORE GO-LIVE:
     1. Delete this entire block of code (lines bounded by these comments).
     2. Delete the corresponding button block in the footer below.
     ===================================================================== */
  const devAutoFill = () => {
    dispatch({ type: 'UPDATE_KYC', patch: { aadhaarVerified: true, panVerified: true, bankVerified: true } });
    navigate('/provider/video-portfolio');
  };
  /* ===================================================================== */

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
        {notification && <div className="bg-secondary/10 text-secondary p-3 rounded-xl text-sm font-semibold">{notification}</div>}
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}

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
              {kyc.aadhaarVerified ? (
                <div className="mt-2 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg font-bold">
                  <CheckCircle2 size={18} /> Verified
                </div>
              ) : (
                <button
                  onClick={handleConnectDigiLocker}
                  disabled={isConnecting || isVerifyingAadhaar}
                  className="mt-2 w-full py-3 bg-white text-[#003876] font-extrabold text-sm rounded-xl hover:bg-gray-100 transition-colors shadow-lg active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2"
                >
                  {(isConnecting || isVerifyingAadhaar) && <Loader2 size={16} className="animate-spin" />}
                  {isVerifyingAadhaar ? 'Verifying...' : 'Connect DigiLocker'}
                </button>
              )}
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
              <p className="text-xs text-muted-foreground mb-3">Click the "Connect DigiLocker" button above to authenticate and verify your Aadhaar securely.</p>
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
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-foreground uppercase"
                    />
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
                  onClick={verifyBankAndPan}
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
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border flex flex-col gap-2">

        {/* =====================================================================
            DEV ONLY: AUTO FILL BUTTON
            HOW TO REMOVE BEFORE GO-LIVE:
            1. Delete this entire button block.
            2. Delete the devAutoFill function defined above.
            ===================================================================== */}
        <button
          onClick={devAutoFill}
          className="w-full py-2 rounded-xl border border-dashed border-yellow-400 text-yellow-500 text-xs font-bold tracking-wide hover:bg-yellow-400/10 transition-colors"
        >
          ⚡ Auto Fill (Demo Only)
        </button>
        {/* ===================================================================== */}

        <button
          onClick={handleNext}
          disabled={!allVerified}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg ${allVerified
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 shadow-none'
            }`}
        >
          <span className="text-[15px] font-bold">Continue to Portfolio</span>
          <ChevronRight size={18} />
        </button>

        {/* 🚧 DEMO ONLY — skip KYC verification, continue onboarding. REMOVE before production. */}
        <button
          type="button"
          onClick={() => navigate('/provider/video-portfolio')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 font-bold text-sm hover:bg-amber-100 active:scale-95 transition-all"
        >
          ⚡ Demo: Skip KYC → Continue
        </button>
      </div>
    </div>
  );
};

export default DigiLockerKYC;