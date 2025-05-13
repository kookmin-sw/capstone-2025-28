import { BellIcon, MenuIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocketStore } from "@/stores/socketStore";

export const DigitalTwinStatusSection = () => {
  const [unreadCount, setUnreadCount] = useState(0);
 
  // 알림 데이터를 관리하는 상태
  const [notifications, setNotifications] = useState<{ id: string | number; message: string }[]>([]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const { registerDashboard } = useSocketStore();
 
  // Room data for mapping
  const rooms = [
    { name: "Room1", icon: "/img/group.png", isActive: true, deviceKey: "RPI-001" },
    { name: "Room2", icon: "/img/group-1.png", isActive: false, deviceKey: "RPI-002" },
    { name: "Room3", icon: "/img/group-2.png", isActive: false, deviceKey: "RPI-003" },
    { name: "Room4", icon: "/img/fi-3172829.svg", isActive: false, deviceKey: "RPI-004" },
    { name: "Room5", icon: "/img/group-4.png", isActive: false, deviceKey: "RPI-005" },
  ];

  const fetchNotifications = async () => {
    const res = await fetch("/api/notifications");
    const data: { notifications: { id: string | number; message: string }[]; unreadCount: number } = await res.json();
    setNotifications(data.notifications);
  };
  
  const addNotification = async (message: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    fetchNotifications(); // 새 알림 추가 후 다시 가져오기
  };
  
  const markAsRead = async (id: string | number) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchNotifications(); // 읽음 처리 후 다시 가져오기
  };
  
  useEffect(() => {
    registerDashboard("RPI-001");
    fetchNotifications();
  }, []);

  return (
    <header className="w-full">
      <div className="flex items-center justify-between w-full mb-4">
        {/* Sidebar Menu Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-neutral-100">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          {/* Sidebar Content */}
          <SheetContent side="left" className="bg-grey-50 text-white p-6">
            <h3 className="text-xl font-bold mb-4">Digital Twin Status</h3>
            <nav className="flex flex-col gap-2">
              <Button variant="ghost" className="justify-start w-full">대시보드홈</Button>
              <Button variant="ghost" className="justify-start w-full">환경설정</Button>
              <Button variant="ghost" className="justify-start w-full">프로필</Button>
              <Button variant="destructive" className="justify-start w-full">로그아웃</Button>
            </nav>
          </SheetContent>
        </Sheet>
        
        <div className="w-full overflow-x-auto flex justify-start sm:justify-center px-2 sm:px-0">
          <nav className="flex flex-nowrap items-center justify-start gap-2 py-2 pr-4 pl-2 bg-grey-50 rounded-xl min-w-max sm:w-fit shadow-[0px_7px_5px_#ffffff0d,inset_0px_1px_1px_#ffffff40,inset_0px_1px_1px_#ffffff1a] backdrop-blur-[46px]">
            {rooms.map((room, index) => (
              <Button
                key={room.name}
                variant={index === activeRoomIndex ? "secondary" : "ghost"}
                className={`flex items-center gap-2 ${
                  index === activeRoomIndex ? "bg-neutral-50 rounded-lg px-3.5 py-[7px]" : ""
                }`}
                onClick={() => {
                  setActiveRoomIndex(index);
                  registerDashboard(room.deviceKey);
                }}
              >
                <span
                  className={`text-neutral-100 text-sm ${index === activeRoomIndex ? "font-semibold" : "font-normal"}`}
                >
                  {room.name}
                </span>
                {room.name === "Dining room" ? (
                  <img
                    className="w-4 h-4"
                    alt={`${room.name} icon`}
                    src={room.icon}
                  />
                ) : (
                  <div
                    className="w-4 h-4 bg-cover bg-center"
                    style={{ backgroundImage: `url(${room.icon})` }}
                  />
                )}
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-neutral-100">
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-sm">{notifications.length}</span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 bg-gray-900 text-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-bold mb-2">Notifications</h3>
              {notifications.length === 0 ? (
                <p className="text-gray-400 text-sm">No new notifications</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 transition"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <span>{notification.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full overflow-hidden">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/img/avatar.png" alt="User avatar" />
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-gray-900 text-white p-2 rounded-lg shadow-md">
              <DropdownMenuItem className="text-sm">@USER-ADMIN</DropdownMenuItem>
              <DropdownMenuItem className="text-sm">환경설정</DropdownMenuItem>
              <DropdownMenuItem className="text-sm text-red-400">로그아웃</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
