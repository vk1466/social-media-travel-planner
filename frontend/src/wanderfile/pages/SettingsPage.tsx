import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/react";
import {
  User,
  Moon,
  Sun,
  Monitor,
  Download,
  Trash2,
  Sliders,
  Shield,
  ArrowLeft,
  Check,
  Info,
} from "lucide-react";
import { getStoredTheme, setStoredTheme, type ThemeMode } from "../theme";
import { useToast } from "../state/ToastContext";
import { cleanupData, reprocessPlaces, type SavedPost, type Place } from "../../api";

interface SettingsPageProps {
  posts: SavedPost[];
  places: Place[];
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export function SettingsPage({ posts, places, isAdmin = false, onRefresh }: SettingsPageProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const clerk = useClerk();
  const { showToast } = useToast();

  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const [cleaning, setCleaning] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setStoredTheme(mode);
    showToast(`Appearance set to ${mode}`);
  };

  // Data export to JSON
  const handleExportJson = () => {
    const data = {
      exported_at: new Date().toISOString(),
      posts,
      places,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wanderfile_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Library exported to JSON");
  };

  // Data export to CSV
  const handleExportCsv = () => {
    const headers = ["post_id", "title", "category", "author", "url", "saved_at"];
    const rows = posts.map((p) => [
      p.post_id,
      `"${(p.title || p.caption || "").replace(/"/g, '""').slice(0, 120)}"`,
      p.content_category || "other",
      p.author_handle || "",
      p.post_url || "",
      p.fetched_at || p.posted_at || "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wanderfile_saves_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Saves exported to CSV");
  };

  // Delete all user data
  const handleDeleteData = async () => {
    if (!window.confirm("Are you sure you want to delete all saved posts, places, and trip data? This cannot be undone.")) {
      return;
    }
    setCleaning(true);
    try {
      await cleanupData();
      showToast("All data deleted");
      onRefresh?.();
      navigate("/");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete data");
    } finally {
      setCleaning(false);
    }
  };

  const handleReprocessPlaces = async () => {
    setReprocessing(true);
    try {
      await reprocessPlaces();
      showToast("Places reprocessed from saves");
      onRefresh?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Reprocessing failed");
    } finally {
      setReprocessing(false);
    }
  };

  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName || email || "Signed-in Explorer";

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "32px 16px 80px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Back button */}
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--wf-text-muted)",
            cursor: "pointer",
            minHeight: "44px",
          }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
          <span>Back</span>
        </button>
      </div>

      <h1 className="wf-type-display" style={{ margin: "0 0 8px" }}>
        Settings & Account
      </h1>
      <p style={{ margin: "0 0 32px", fontSize: "15px", color: "var(--wf-text-muted)" }}>
        Manage your profile, theme, preferences, and data.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* 1. Profile section */}
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "var(--wf-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--wf-primary)",
                }}
              >
                <User size={28} strokeWidth={1.75} />
              </div>
            )}
            <div>
              <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "18px" }}>
                {displayName}
              </h2>
              {email && (
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--wf-text-muted)" }}>
                  {email}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (clerk && clerk.signOut) {
                clerk.signOut(() => navigate("/"));
              }
            }}
            style={{
              height: "44px",
              padding: "0 18px",
              borderRadius: "var(--wf-radius-control)",
              border: "1px solid var(--wf-border)",
              background: "var(--wf-surface-2)",
              color: "var(--wf-text)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </section>

        {/* 2. Appearance section (Light / Dark / System) */}
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <h2 className="wf-type-h2" style={{ margin: "0 0 6px", fontSize: "18px" }}>
            Appearance
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--wf-text-muted)" }}>
            Choose how Wanderfile looks to you on this device.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
            {[
              { mode: "light" as const, label: "Light", Icon: Sun },
              { mode: "dark" as const, label: "Dark", Icon: Moon },
              { mode: "system" as const, label: "System", Icon: Monitor },
            ].map(({ mode, label, Icon }) => {
              const isSelected = theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleThemeChange(mode)}
                  style={{
                    height: "56px",
                    borderRadius: "var(--wf-radius-control)",
                    border: isSelected ? "2px solid var(--wf-primary)" : "1px solid var(--wf-border)",
                    background: isSelected ? "var(--wf-surface-2)" : "var(--wf-surface)",
                    color: "var(--wf-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontFamily: "inherit",
                    fontSize: "15px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={18} strokeWidth={1.75} color={isSelected ? "var(--wf-primary)" : "currentColor"} />
                  <span>{label}</span>
                  {isSelected && <Check size={16} strokeWidth={2.5} color="var(--wf-primary)" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Map Units Preference */}
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Sliders size={18} strokeWidth={1.75} color="var(--wf-primary)" />
            <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "18px" }}>
              Map Units
            </h2>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--wf-text-muted)" }}>
            Choose preferred unit of distance for places and trips.
          </p>

          <div style={{ display: "flex", gap: "12px" }}>
            {[
              { id: "km", label: "Kilometers (km)" },
              { id: "mi", label: "Miles (mi)" },
            ].map(({ id, label }) => {
              const currentUnits = (() => {
                try {
                  return localStorage.getItem("wf_map_units") || "km";
                } catch {
                  return "km";
                }
              })();
              const isSelected = currentUnits === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem("wf_map_units", id);
                    } catch {
                      // ignore
                    }
                    showToast(`Map units set to ${label}`);
                  }}
                  style={{
                    flex: 1,
                    height: "44px",
                    borderRadius: "var(--wf-radius-control)",
                    border: isSelected ? "2px solid var(--wf-primary)" : "1px solid var(--wf-border)",
                    background: isSelected ? "var(--wf-surface-2)" : "var(--wf-surface)",
                    color: "var(--wf-text)",
                    fontSize: "14px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span>{label}</span>
                  {isSelected && <Check size={16} strokeWidth={2.5} color="var(--wf-primary)" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. Data Export section */}
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Download size={18} strokeWidth={1.75} color="var(--wf-primary)" />
            <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "18px" }}>
              Data Export
            </h2>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--wf-text-muted)" }}>
            Download a portable copy of all your saved reels, places, and tags anytime.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExportJson}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "var(--wf-radius-control)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface-2)",
                color: "var(--wf-text)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Download size={16} strokeWidth={2} />
              <span>Export as JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "var(--wf-radius-control)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface-2)",
                color: "var(--wf-text)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Download size={16} strokeWidth={2} />
              <span>Export as CSV</span>
            </button>
          </div>
        </section>

        {/* 6. Admin Tools (if admin) */}
        {isAdmin && (
          <section
            style={{
              background: "var(--wf-surface)",
              border: "1px solid var(--wf-border)",
              borderRadius: "var(--wf-radius-card)",
              padding: "24px",
              boxShadow: "var(--wf-shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Shield size={18} strokeWidth={1.75} color="var(--wf-primary)" />
              <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "18px" }}>
                Admin & Maintenance Tools
              </h2>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--wf-text-muted)" }}>
              Rebuild shared place candidate indices or manage accounts.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link
                to="/admin"
                style={{
                  height: "44px",
                  padding: "0 18px",
                  borderRadius: "var(--wf-radius-control)",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface-2)",
                  color: "var(--wf-text)",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Admin Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={handleReprocessPlaces}
                disabled={reprocessing}
                style={{
                  height: "44px",
                  padding: "0 18px",
                  borderRadius: "var(--wf-radius-control)",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface-2)",
                  color: "var(--wf-text)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: reprocessing ? "not-allowed" : "pointer",
                }}
              >
                {reprocessing ? "Reprocessing…" : "Reprocess Places"}
              </button>
            </div>
          </section>
        )}

        {/* 7. Delete My Data (Danger Zone) */}
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-danger)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Trash2 size={18} strokeWidth={1.75} color="var(--wf-danger)" />
            <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "18px", color: "var(--wf-danger)" }}>
              Delete My Data
            </h2>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--wf-text-muted)" }}>
            Permanently delete all your saved reels, places, and trip collections.
          </p>

          <button
            type="button"
            onClick={handleDeleteData}
            disabled={cleaning}
            style={{
              height: "44px",
              padding: "0 20px",
              borderRadius: "var(--wf-radius-control)",
              border: "none",
              background: "var(--wf-danger)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 600,
              cursor: cleaning ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Trash2 size={16} strokeWidth={2} />
            <span>{cleaning ? "Deleting everything…" : "Delete all my data"}</span>
          </button>
        </section>

        {/* 8. About Wanderfile */}
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Info size={18} strokeWidth={1.75} color="var(--wf-primary)" />
            <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "18px" }}>
              About Wanderfile
            </h2>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--wf-text-muted)" }}>
            Turn saved travel reels into your personal map you'll actually use.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px",
              color: "var(--wf-text-muted)",
              borderTop: "1px solid var(--wf-border)",
              paddingTop: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Version</span>
              <span style={{ fontWeight: 600, color: "var(--wf-text)" }}>1.0.0</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Map data</span>
              <span style={{ fontWeight: 600, color: "var(--wf-text)" }}>CARTO Positron · OpenStreetMap</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
