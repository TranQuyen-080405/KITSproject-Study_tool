import type { Account } from "../types/auth";

type AccountBadgeProps = { account: Account; onLogout: () => void };

export function AccountBadge({ account, onLogout }: AccountBadgeProps) {
  return (
    <div className="account-badge">
      <span aria-hidden="true" className="account-avatar">{account.displayName.charAt(0).toUpperCase()}</span>
      <span className="account-name">{account.displayName}</span>
      <button aria-label="Đăng xuất" onClick={onLogout} type="button">↪</button>
    </div>
  );
}
