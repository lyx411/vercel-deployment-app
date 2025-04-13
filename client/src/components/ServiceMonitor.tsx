import React from 'react';
import StatusIndicator from './StatusIndicator';

interface ServiceMonitorProps {
  services: {
    name: string;
    url: string;
    description?: string;
  }[];
}

const ServiceMonitor: React.FC<ServiceMonitorProps> = ({ services }) => {
  const [statuses, setStatuses] = React.useState<Record<string, boolean>>({});

  const handleStatusChange = (serviceName: string, isOnline: boolean) => {
    setStatuses(prev => ({
      ...prev,
      [serviceName]: isOnline
    }));
  };

  const allServicesOnline = Object.values(statuses).every(status => status === true);
  const servicesChecked = Object.keys(statuses).length === services.length;

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">服务监控</h2>
        
        {servicesChecked && (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${allServicesOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm font-medium">
              {allServicesOnline ? '所有服务正常' : '部分服务异常'}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <div key={service.name} className="border rounded-md p-3">
            <h3 className="font-medium mb-2">{service.name}</h3>
            {service.description && (
              <p className="text-sm text-gray-600 mb-3">{service.description}</p>
            )}
            <StatusIndicator 
              serviceUrl={service.url} 
              onStatusChange={(isOnline) => handleStatusChange(service.name, isOnline)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceMonitor;