import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Video, Camera, ImagePlus, X, Play, RotateCcw,
  CheckCircle2, ChevronRight, Clock, FileText, Upload,
  Trash2, Plus, Sparkles, AlertCircle, Image as ImageIcon
} from 'lucide-react';

interface PhotoPair {
  id: string;
  before: string | null;
  after: string | null;
  caption: string;
}

interface Certificate {
  id: string;
  name: string | null;
  uri: string | null;
}

const VideoPortfolio = () => {
  const navigate = useNavigate();

  // Video state
  const [videoState, setVideoState] = useState<'idle' | 'camera' | 'recorded' | 'uploaded'>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [error, setError] = useState("");

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const videoGalleryRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      setVideoState('camera');
      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      showError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (liveVideoRef.current?.srcObject) {
      const stream = liveVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = () => {
    if (!liveVideoRef.current?.srcObject) return;
    recordedChunksRef.current = [];
    const stream = liveVideoRef.current.srcObject as MediaStream;
    try {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setVideoUri(URL.createObjectURL(blob));
        setVideoState('recorded');
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (e) {
      showError('Failed to start recording');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopCamera();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | number;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, stopRecording]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/quicktime', 'video/3gpp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp4', 'mov', '3gp'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext || '')) {
      showError('Invalid format. Only .mp4, .mov, .3gp are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showError('Video must be less than 15MB.');
      e.target.value = '';
      return;
    }

    const uri = URL.createObjectURL(file);
    setVideoUri(uri);
    setVideoState('recorded');
    e.target.value = '';
  };

  const resetRecording = () => {
    setVideoState('idle');
    setVideoUri(null);
    setRecordingTime(0);
    setIsRecording(false);
  };

  const acceptVideo = async () => {
    setVideoState('uploaded');
  };

  // Photos state
  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const photoGalleryRef = useRef<HTMLInputElement>(null);
  const [activePhotoTarget, setActivePhotoTarget] = useState<{ id: string, type: 'before' | 'after' } | null>(null);

  const triggerPhoto = (id: string, type: 'before' | 'after', source: 'camera' | 'gallery') => {
    setActivePhotoTarget({ id, type });
    if (source === 'camera') photoCameraRef.current?.click();
    else photoGalleryRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoTarget) return;

    const validTypes = ['image/jpeg', 'image/heic', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'heic', 'webp'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext || '')) {
      showError('Invalid format. Only .jpg, .jpeg, .heic, .webp are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Photo must be less than 5MB.');
      e.target.value = '';
      return;
    }

    const uri = URL.createObjectURL(file);
    setPhotoPairs(prev => prev.map(p => {
      if (p.id === activePhotoTarget.id) {
        return { ...p, [activePhotoTarget.type]: uri };
      }
      return p;
    }));

    e.target.value = '';
  };

  const addPhotoPair = () => {
    if (photoPairs.length >= 5) {
      showError('You can upload up to 5 before/after photo pairs.');
      return;
    }
    const id = Date.now().toString();
    setPhotoPairs([...photoPairs, { id, before: null, after: null, caption: '' }]);
  };

  const removePhotoPair = (id: string) => {
    setPhotoPairs(photoPairs.filter((p) => p.id !== id));
  };

  // Certificates state
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const certCameraRef = useRef<HTMLInputElement>(null);
  const certGalleryRef = useRef<HTMLInputElement>(null);

  const [activeCertTarget, setActiveCertTarget] = useState<string | null>(null);

  const triggerCert = (id: string, source: 'camera' | 'gallery') => {
    setActiveCertTarget(id);
    if (source === 'camera') certCameraRef.current?.click();
    else certGalleryRef.current?.click();
  };

  const addCertificate = () => {
    if (certificates.length >= 5) {
      showError('You can upload up to 5 certificates.');
      return;
    }
    const id = Date.now().toString();
    setCertificates([...certificates, { id, name: null, uri: null }]);
  };

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCertTarget) return;

    const validTypes = ['image/jpeg', 'image/heic', 'image/webp', 'application/pdf'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'heic', 'webp', 'pdf'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext || '')) {
      showError('Invalid format. Only .jpg, .jpeg, .heic, .webp, .pdf are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('File must be less than 5MB.');
      e.target.value = '';
      return;
    }

    const uri = URL.createObjectURL(file);
    setCertificates(prev => prev.map(c => {
      if (c.id === activeCertTarget) {
        return { ...c, name: file.name, uri };
      }
      return c;
    }));

    e.target.value = '';
  };

  const removeCertificate = (id: string) => {
    setCertificates(certificates.filter((c) => c.id !== id));
  };
  // TODO: Rollback this change. Uncomment the line below to enforce video upload before proceeding.
  // const canProceed = videoState === 'uploaded';
  const canProceed = true; // Temporary bypass

  const handleNext = useCallback(() => {
    navigate('/provider/gps-consent');
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canProceed, handleNext]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={22} className="text-primary" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-primary">Video Portfolio</h1>
        <span className="text-xs font-semibold text-muted-foreground">Step 4 of 6</span>
      </div>

      <div className="flex-1 p-5 pb-20 space-y-8 overflow-y-auto">
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        {/* ═══ SECTION 1: VIDEO INTRODUCTION ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Video size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Video Introduction</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Required · 30 seconds max</p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(3,9,22,0.06)]">
            {videoState === 'idle' && (
              <>
                <div className="rounded-2xl overflow-hidden mb-4 h-[260px] bg-[#1a1a1a] flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center gap-3 w-full h-full bg-gray-100">
                    <Camera size={48} className="text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-[13px] text-muted-foreground">Camera preview will appear here</p>
                  </div>
                </div>

                <div className="flex bg-amber-500/10 rounded-xl p-3.5 mb-4 border border-amber-500/20">
                  <Sparkles size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 ml-2.5">
                    <p className="text-xs font-bold text-primary mb-1">What to say:</p>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      "Hi, I'm [your name]. I've been a [your service] for [X] years. I specialize in [your specialty]. I'm reliable and always clean up after the job."
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={startCamera}
                    className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors rounded-xl py-4 flex items-center justify-center gap-2"
                  >
                    <Camera size={18} className="text-white" />
                    <span className="text-[14px] font-bold text-white">Record</span>
                  </button>
                  <button 
                    onClick={() => videoGalleryRef.current?.click()}
                    className="flex-1 bg-primary hover:bg-[#1C3D63] transition-colors rounded-xl py-4 flex items-center justify-center gap-2"
                  >
                    <Video size={18} className="text-white" />
                    <span className="text-[14px] font-bold text-white">Gallery</span>
                  </button>
                </div>
                <input type="file" accept=".mp4,.mov,.3gp,video/mp4,video/quicktime,video/3gpp" ref={videoGalleryRef} className="hidden" onChange={handleVideoUpload} />
              </>
            )}

            {videoState === 'camera' && (
              <div className="relative rounded-2xl overflow-hidden mb-4 h-[350px] bg-black flex items-center justify-center">
                <video 
                  ref={liveVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
                
                {/* Teleprompter Overlay */}
                <div className="absolute top-4 left-4 right-4 bg-black/50 backdrop-blur-md p-3.5 rounded-xl border border-white/10 z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Teleprompter</span>
                  </div>
                  <p className="text-white/90 text-sm font-medium leading-relaxed">
                    "Hi, I'm <span className="text-amber-400">[Name]</span>. I've been a <span className="text-amber-400">[Service]</span> for <span className="text-amber-400">[X]</span> years. I specialize in <span className="text-amber-400">[Specialty]</span>."
                  </p>
                </div>

                {/* Timer/Progress Bar */}
                {isRecording && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-800/50 z-20">
                    <div 
                      className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(recordingTime / 30) * 100}%` }}
                    />
                  </div>
                )}
                
                {/* Timer Text */}
                {isRecording && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-600 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-20">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-sm font-bold tracking-wider font-mono">00:{(30 - recordingTime).toString().padStart(2, '0')}</span>
                  </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 px-4 items-center z-20">
                  {!isRecording ? (
                    <>
                      <button 
                        onClick={() => { stopCamera(); setVideoState('idle'); }}
                        className="w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-colors text-white"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={startRecording}
                        className="w-16 h-16 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition-colors ring-4 ring-red-600/30"
                      >
                        <div className="w-6 h-6 bg-white rounded-full" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={stopRecording}
                      className="w-16 h-16 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition-colors ring-4 ring-red-600/30"
                    >
                      <div className="w-6 h-6 bg-white rounded-sm" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {videoState === 'recorded' && (
              <>
                <div className="rounded-2xl overflow-hidden mb-4 h-[260px] bg-[#0a0a0a] flex items-center justify-center relative">
                  {videoUri && <video src={videoUri} controls className="w-full h-full object-contain" />}
                </div>

                <div className="flex gap-2.5 mt-4">
                  <button 
                    onClick={resetRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    <RotateCcw size={18} className="text-primary" />
                    <span className="text-[13px] font-bold text-primary">Re-record</span>
                  </button>

                  <button 
                    onClick={acceptVideo}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-emerald-600 border border-emerald-600 hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle2 size={18} className="text-white" />
                    <span className="text-[13px] font-bold text-white">Accept</span>
                  </button>
                </div>
              </>
            )}

            {videoState === 'uploaded' && (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle2 size={40} className="text-emerald-600 mb-1" fill="currentColor" />
                <h3 className="text-xl font-bold text-primary">Video uploaded!</h3>
                <p className="text-[13px] text-muted-foreground text-center leading-relaxed max-w-[280px]">
                  Your intro is ready. Customers will see this before booking you.
                </p>
                <button 
                  onClick={resetRecording}
                  className="flex items-center gap-1.5 mt-2 hover:opacity-80 transition-opacity"
                >
                  <RotateCcw size={14} className="text-primary" />
                  <span className="text-[13px] font-semibold text-primary">Re-record video</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═══ SECTION 2: BEFORE/AFTER PHOTOS ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <ImagePlus size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Before & After Photos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Optional · Up to 5 pairs</p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(3,9,22,0.06)]">
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
              Show your best work. Upload before and after photos from past jobs to build trust with customers.
            </p>

            {photoPairs.map((pair, index) => (
              <div key={pair.id} className="bg-gray-100 rounded-xl p-3.5 mb-3">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[13px] font-bold text-primary">Job {index + 1}</span>
                  <button onClick={() => removePhotoPair(pair.id)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2.5">
                  <div className="flex-1">
                    {pair.before ? (
                      <div className="relative h-[90px] rounded-lg overflow-hidden border border-gray-200">
                        <img src={pair.before} alt="Before" className="w-full h-full object-cover" />
                        <button onClick={() => setPhotoPairs(prev => prev.map(p => p.id === pair.id ? {...p, before: null} : p))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-[90px] rounded-lg bg-white border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">Before</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => triggerPhoto(pair.id, 'before', 'camera')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><Camera size={14} className="text-primary" /></button>
                          <button onClick={() => triggerPhoto(pair.id, 'before', 'gallery')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ImageIcon size={14} className="text-primary" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    {pair.after ? (
                      <div className="relative h-[90px] rounded-lg overflow-hidden border border-gray-200">
                        <img src={pair.after} alt="After" className="w-full h-full object-cover" />
                        <button onClick={() => setPhotoPairs(prev => prev.map(p => p.id === pair.id ? {...p, after: null} : p))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-[90px] rounded-lg bg-white border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">After</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => triggerPhoto(pair.id, 'after', 'camera')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><Camera size={14} className="text-primary" /></button>
                          <button onClick={() => triggerPhoto(pair.id, 'after', 'gallery')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ImageIcon size={14} className="text-primary" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Caption input */}
                {(pair.before || pair.after) && (
                  <div className="mt-3">
                    <input 
                      type="text" 
                      placeholder="Caption (e.g. 'Kitchen rewiring')" 
                      value={pair.caption}
                      onChange={(e) => setPhotoPairs(prev => prev.map(p => p.id === pair.id ? {...p, caption: e.target.value} : p))}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 text-[13px] focus:outline-none focus:border-[#152E4B] text-primary"
                    />
                  </div>
                )}
              </div>
            ))}

            <button 
              onClick={addPhotoPair}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-[#152E4B]/30 bg-white hover:bg-background transition-colors"
            >
              <Plus size={18} className="text-primary" />
              <span className="text-sm font-bold text-primary">
                {photoPairs.length === 0 ? 'Add Before & After Photos' : 'Add Another Pair'}
              </span>
            </button>
            <input type="file" accept="image/*" capture="environment" ref={photoCameraRef} className="hidden" onChange={handlePhotoUpload} />
            <input type="file" accept=".jpg,.jpeg,.heic,.webp,image/jpeg,image/heic,image/webp" ref={photoGalleryRef} className="hidden" onChange={handlePhotoUpload} />
          </div>
        </section>

        {/* ═══ SECTION 3: CERTIFICATES ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <FileText size={14} className="text-neutral-900" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Certificates & Licenses</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Optional · PDF or image</p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(3,9,22,0.06)]">
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
              Upload any professional certifications, trade licenses, or training certificates. These boost your profile credibility.
            </p>

            {certificates.map((cert, index) => (
              <div key={cert.id} className="bg-gray-100 rounded-xl p-3.5 mb-3">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[13px] font-bold text-primary">Certificate {index + 1}</span>
                  <button onClick={() => removeCertificate(cert.id)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
                {cert.uri ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
                      {cert.name?.endsWith('.pdf') ? <FileText size={18} className="text-primary" /> : <img src={cert.uri} alt="cert" className="w-full h-full object-cover" />}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-primary truncate">
                      {cert.name}
                    </span>
                    <button onClick={() => setCertificates(prev => prev.map(c => c.id === cert.id ? {...c, uri: null, name: null} : c))} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors shrink-0">
                      <X size={18} className="text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => triggerCert(cert.id, 'camera')}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-[#152E4B]/30 bg-white hover:bg-background transition-colors"
                    >
                      <Camera size={18} className="text-primary" />
                      <span className="text-sm font-bold text-primary">Take Photo</span>
                    </button>
                    <button 
                      onClick={() => triggerCert(cert.id, 'gallery')}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-[#152E4B]/30 bg-white hover:bg-background transition-colors"
                    >
                      <Upload size={18} className="text-primary" />
                      <span className="text-sm font-bold text-primary">Upload File</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button 
              onClick={addCertificate}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-[#152E4B]/30 bg-white hover:bg-background transition-colors mt-1"
            >
              <Plus size={18} className="text-primary" />
              <span className="text-sm font-bold text-primary">
                {certificates.length === 0 ? 'Add Certificate' : 'Add Another'}
              </span>
            </button>
            <input type="file" accept="image/*" capture="environment" ref={certCameraRef} className="hidden" onChange={handleCertUpload} />
            <input type="file" accept=".jpg,.jpeg,.heic,.webp,.pdf,image/jpeg,image/heic,image/webp,application/pdf" ref={certGalleryRef} className="hidden" onChange={handleCertUpload} />

            <div className="mt-3.5 p-3 rounded-xl bg-gray-100">
              <p className="text-[11px] font-bold text-primary mb-1">Examples:</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ITI certificate, electrician license, pest control certification, plumbing trade certificate, safety training diploma
              </p>
            </div>
          </div>
        </section>

        {/* ═══ CONTINUE BUTTON ═══ */}
        <section className="pt-4">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all ${
              canProceed 
                ? 'bg-primary hover:bg-[#1C3D63] shadow-md' 
                : 'bg-gray-200 cursor-not-allowed'
            }`}
          >
            <span className={`text-base font-bold ${canProceed ? 'text-white' : 'text-muted-foreground'}`}>
              Continue to GPS Consent
            </span>
            <ChevronRight size={18} className={canProceed ? 'text-white' : 'text-muted-foreground'} />
          </button>

          {!canProceed && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <AlertCircle size={14} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Record and accept your video introduction to continue</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default VideoPortfolio;
