import { useNavigate } from "react-router-dom";
import { services } from "@/data/mockData";
import ScreenHeader from "@/components/ScreenHeader";
import ServiceCard from "@/components/ServiceCard";
import { useApp } from "@/context/AppContext";

const ServicesPage = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  return (
    <div className="min-h-full flex flex-col bg-background">
      <ScreenHeader title="All Services" />
      <div className="flex-1 px-5 pb-8">
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {services.map((s, i) => (
            <div
              key={s.id}
              className="animate-fade-in-up h-full"
              style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}
            >
              <ServiceCard
                service={s}
                onClick={() => {
                  navigate(`/service-select/${s.id}`);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
