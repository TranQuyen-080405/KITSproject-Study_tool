import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  fetchAnalyticsDashboard,
  type StrugglingWord,
} from "../api/analytics-api";
import { BellIcon2D, PlayIcon2D } from "./icons";
import { formatWaitRemaining, isReviewDue } from "../lib/review-time";

type ReviewActions = {
  token: string;
  accountId?: number;
  refreshKey: string;
  startReview: (items: StrugglingWord[], extras?: StrugglingWord[]) => void;
  openSchedule: () => void;
};

export const ReviewActionsContext = createContext<ReviewActions | null>(null);

export function ReviewBell() {
  const actions = useContext(ReviewActionsContext);
  const [dueWords, setDueWords] = useState<StrugglingWord[]>([]);
  const [upcomingWords, setUpcomingWords] = useState<StrugglingWord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const wrapRef = useRef<HTMLDivElement>(null);
  const token = actions?.token;
  const accountId = actions?.accountId;
  const refreshKey = actions?.refreshKey;

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchAnalyticsDashboard(token)
      .then((body) => {
        if (!active) return;
        const words = body.strugglingWords ?? [];
        const moment = Date.now();
        setDueWords(words.filter((word) => isReviewDue(word.nextReviewAt, moment)));
        setUpcomingWords(words.filter((word) => !isReviewDue(word.nextReviewAt, moment)));
      })
      .catch(() => {
        if (!active) return;
        setDueWords([]);
        setUpcomingWords([]);
      });
    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const dueSignature = dueWords.map((word) => word.cardId).sort().join(",");
  const notificationKey = `haru-review-notification-${accountId ?? "current"}`;

  useEffect(() => {
    if (!dueSignature) {
      setShowPopup(false);
      return;
    }
    setShowPopup(sessionStorage.getItem(notificationKey) !== dueSignature);
  }, [dueSignature, notificationKey]);

  if (!actions) return null;

  function dismissPopup() {
    if (dueSignature) sessionStorage.setItem(notificationKey, dueSignature);
    setShowPopup(false);
  }

  function practice() {
    if (dueWords.length === 0) {
      actions?.openSchedule();
      return;
    }
    setIsOpen(false);
    dismissPopup();
    actions?.startReview(dueWords, upcomingWords);
  }

  const nextWait = upcomingWords[0]
    ? formatWaitRemaining(upcomingWords[0].nextReviewAt, now)
    : "";

  const panelOpen = isOpen || showPopup;

  return (
    <div className="review-bell-dock" ref={wrapRef}>
      <button
        aria-expanded={panelOpen}
        aria-label={dueWords.length > 0 ? `${dueWords.length} từ đến lượt` : "Chuông ôn tập"}
        className={`review-bell-button${dueWords.length > 0 ? " review-bell-button-active" : ""}`}
        onClick={() => {
          if (panelOpen) {
            setIsOpen(false);
            dismissPopup();
          } else {
            setIsOpen(true);
          }
        }}
        type="button"
      >
        <BellIcon2D size={18} />
        <span className="review-bell-label">Ôn tập</span>
        {dueWords.length > 0 ? <span className="review-bell-badge">{dueWords.length}</span> : null}
      </button>
      {panelOpen ? (
        <div className="review-bell-popover" role="status">
          <div className="review-bell-popover-copy">
            <strong>{dueWords.length > 0 ? "Đến lượt ôn" : "Chưa đến lượt"}</strong>
            <span>
              {dueWords.length > 0
                ? `${dueWords.length} từ`
                : nextWait
                  ? nextWait
                  : "Chưa có lịch"}
            </span>
          </div>
          <div className="review-bell-actions">
            {dueWords.length > 0 ? (
              <button className="manage-primary-button" onClick={practice} type="button">
                <PlayIcon2D size={14} /> Luyện
              </button>
            ) : null}
            <button className="manage-secondary-button" onClick={() => { setIsOpen(false); actions.openSchedule(); }} type="button">
              Lịch học
            </button>
            {showPopup ? (
              <button aria-label="Đóng" className="review-popup-close" onClick={dismissPopup} type="button">×</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
