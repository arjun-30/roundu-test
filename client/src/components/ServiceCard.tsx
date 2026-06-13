import { Service } from "@/data/mockData";

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
  onQuickFix?: () => void;
  variant?: "compact" | "tile";
}

const ServiceCard = ({
  service,
  onClick,
  onQuickFix,
  variant = "tile",
}: ServiceCardProps) => {

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className="glass-card service-card flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.97] text-left shadow-card w-full h-full"
      >
        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <service.icon
            size={20}
            className="text-primary-foreground"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">
            {service.label}
          </p>

          <p className="text-[10px] text-muted-foreground truncate">
            {service.desc}
          </p>
        </div>

        {onQuickFix && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickFix();
            }}
            className="px-2.5 py-1.5 bg-[#A95D06] hover:bg-[#A95D06]/90 text-white font-bold text-[10px] rounded-xl flex-shrink-0 active:scale-95 transition-all z-10"
          >
            Quick Fix
          </button>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="glass-card service-card bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 transition-all active:scale-[0.97] shadow-card w-full h-full flex flex-col justify-between"
    >
      <div>
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
          <service.icon
            size={22}
            className="text-primary-foreground"
          />
        </div>

        <h3 className="text-sm font-bold text-foreground">
          {service.label}
        </h3>

        <p className="text-[10px] text-muted-foreground mt-0.5">
          {service.desc}
        </p>
      </div>

      {onQuickFix && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickFix();
          }}
          className="mt-3 px-3 py-1.5 bg-[#A95D06] hover:bg-[#A95D06]/90 text-white font-bold text-[10px] rounded-xl active:scale-95 transition-all shadow-sm z-10 self-start"
        >
          Quick Fix
        </button>
      )}
    </button>
  );
};

export default ServiceCard;