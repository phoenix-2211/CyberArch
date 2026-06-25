import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { api } from "@/services/api";

const DashboardLayout = () => {
  const [alertCount, setAlertCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const stats = await api.getDashboardStats();
        setAlertCount(stats?.active_alerts || 0);
        setDeviceCount(stats?.total_devices || 0);
        setEventCount(stats?.events_today || 0);
      } catch {
        // silently fail for sidebar counts
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar alertCount={alertCount} deviceCount={deviceCount} eventCount={eventCount} />
      <div className="ml-[220px] min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
