"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { SESSION_WARNING_MS } from "@/lib/session-policy";

function SessionMonitor() {
    const { data: session, status, update } = useSession();
    const deadline = session?.sessionDeadline;
    const lastUpdate = useRef(0);
    const warnedDeadline = useRef(0);
    const hadSession = useRef(false);
    const signingOut = useRef(false);
    const checkingExpiry = useRef(false);

    useEffect(() => {
        if (status === "authenticated") hadSession.current = true;
        if (status === "unauthenticated" && hadSession.current && !signingOut.current) {
            signingOut.current = true;
            const callback = window.location.pathname + window.location.search;
            window.location.assign(`/login?callbackUrl=${encodeURIComponent(callback)}`);
        }
    }, [status]);

    useEffect(() => {
        if (status !== "authenticated" || !deadline) return;
        const check = () => {
            const remaining = deadline - Date.now();
            if (remaining <= 0 && !signingOut.current && !checkingExpiry.current) {
                checkingExpiry.current = true;
                void update().then((current) => {
                    if (current?.sessionDeadline && current.sessionDeadline > Date.now()) return;
                    signingOut.current = true;
                    const callback = window.location.pathname + window.location.search;
                    void signOut({ callbackUrl: `/login?callbackUrl=${encodeURIComponent(callback)}` });
                }).catch(() => {
                    toast.error("Không thể kiểm tra phiên đăng nhập. Vui lòng kiểm tra kết nối.");
                }).finally(() => { checkingExpiry.current = false; });
            } else if (remaining > 0 && remaining <= SESSION_WARNING_MS && warnedDeadline.current !== deadline) {
                warnedDeadline.current = deadline;
                toast.warning("Phiên sắp hết hạn. Hãy lưu công việc của bạn.", { duration: 15000 });
            }
        };
        check();
        const timer = window.setInterval(check, 15000);
        const activity = () => {
            if (Date.now() >= deadline) { check(); return; }
            if (Date.now() - lastUpdate.current < 60_000) return;
            lastUpdate.current = Date.now();
            void update({ activity: true });
        };
        const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
        events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
        window.addEventListener("focus", check);
        return () => {
            window.clearInterval(timer);
            events.forEach((event) => window.removeEventListener(event, activity));
            window.removeEventListener("focus", check);
        };
    }, [deadline, status, update]);
    return null;
}

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return <SessionProvider><SessionMonitor />{children}</SessionProvider>;
}
