import { useEffect, useId, useState } from "react";

import {
  fetchAdminUsers,
  getViewAsUserId,
  setViewAsUserId,
  type AdminUser,
} from "../api";
import "./view-as-switcher.css";

export interface ViewAsSwitcherProps {
  enabled: boolean;
  onChange?: (userId: string | null) => void;
}

function labelForUser(user: AdminUser): string {
  if (user.email) {
    return user.display_name ? `${user.email} (${user.display_name})` : user.email;
  }
  if (user.display_name) {
    return `${user.display_name} · ${user.user_id}`;
  }
  return user.user_id;
}

export function ViewAsSwitcher({ enabled, onChange }: ViewAsSwitcherProps) {
  const selectId = useId();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(() => getViewAsUserId() ?? "");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetchAdminUsers();
        if (!cancelled) {
          setUsers(response.users);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load users");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <label className="wf-view-as" htmlFor={selectId}>
      <span className="wf-view-as-label">View as</span>
      <select
        id={selectId}
        className="wf-view-as-select"
        value={selectedUserId}
        onChange={(event) => {
          const next = event.target.value;
          setSelectedUserId(next);
          const acting = next || null;
          setViewAsUserId(acting);
          onChange?.(acting);
        }}
      >
        <option value="">My account</option>
        {users.map((user) => (
          <option key={user.user_id} value={user.user_id}>
            {labelForUser(user)}
          </option>
        ))}
      </select>
      {loadError ? <span className="wf-view-as-error">{loadError}</span> : null}
    </label>
  );
}
