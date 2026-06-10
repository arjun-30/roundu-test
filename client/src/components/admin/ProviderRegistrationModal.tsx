import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface Provider {
  id: string;
  full_name: string;
  service_type: string;
  created_at: string;
  phone?: string;
}

interface ProviderRegistrationModalProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (providerId: string) => Promise<void>;
  onReject: (providerId: string) => Promise<void>;
  isLoading?: boolean;
  onViewDetails?: () => void;
}

export default function ProviderRegistrationModal({
  provider,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading = false,
  onViewDetails,
}: ProviderRegistrationModalProps) {
  if (!provider) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl transition-colors z-10"
            >
              <X size={20} className="text-slate-600" />
            </button>

            {/* Content */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <ExternalLink size={32} className="text-white" strokeWidth={1.5} />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-center text-2xl font-bold text-slate-900 mb-1">
                New Provider Registration
              </h2>
              <p className="text-center text-sm text-slate-600 mb-6">
                A service provider is awaiting approval
              </p>

              {/* Provider Details */}
              <div className="bg-white rounded-2xl p-4 mb-6 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Provider Name</p>
                  <p className="text-lg font-bold text-slate-900">{provider.full_name}</p>
                </div>
                {provider.service_type && (
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Service</p>
                    <p className="text-sm text-slate-700 capitalize">{provider.service_type}</p>
                  </div>
                )}
                {provider.phone && (
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Phone</p>
                    <p className="text-sm text-slate-700">{provider.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Applied</p>
                  <p className="text-sm text-slate-700">
                    {new Date(provider.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => onReject(provider.id)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-200 text-red-700 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={18} />
                  Reject
                </button>
                <button
                  onClick={() => onApprove(provider.id)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
                >
                  <CheckCircle size={18} />
                  Approve
                </button>
              </div>

              {/* Link to full details */}
              <button
                onClick={onViewDetails ?? onClose}
                className="w-full mt-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                View Details in Provider Management →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
