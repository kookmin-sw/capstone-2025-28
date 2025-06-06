import { NextResponse } from "next/server";

let notifications = [
  { id: 1, message: "횐영합니다", is_read: false },
  { id: 2, message: "대기질 변동시 알려드리겠습니다.", is_read: false },
];

// 📌 **알림 목록 조회 (GET)**
export async function GET() {
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return NextResponse.json({ notifications, unreadCount });
}

// 📌 **새로운 알림 추가 (POST)**
export async function POST(req: Request) {
  const { message } = await req.json();
  const newNotification = { id: Date.now(), message, is_read: false };
  notifications.push(newNotification);
  return NextResponse.json(newNotification, { status: 201 });
}

// 📌 **알림 읽음 처리 (PATCH)**
export async function PATCH(req: Request) {
  const { id } = await req.json();
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, is_read: true } : n
  );
  return NextResponse.json({ success: true });
}