import { LogoutIcon2D } from "./icons";
import type { Account } from "../types/auth";

type AccountBadgeProps = { account: Account; onLogout: () => void };

export function AccountBadge({ account, onLogout }: AccountBadgeProps) {
  const initial = (account.displayName || account.username || "U").charAt(0).toUpperCase();

  return (
    <div className="account-badge">
      <span aria-hidden="true" className="account-avatar">{initial}</span>
      <span className="account-name" title={account.displayName}>{account.displayName}</span>
      <button aria-label="Đăng xuất khỏi tài khoản" className="interactive-element" onClick={onLogout} type="button">
        <LogoutIcon2D size={12} />
        <span>Thoát</span>
      </button>
    </div>
  );
}
