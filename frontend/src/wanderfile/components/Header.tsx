import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { savingCount, openSaveSheet, saveUrl } = useSavePipeline();
  const [inputValue, setInputValue] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;

    if (val.startsWith("http://") || val.startsWith("https://")) {
      await saveUrl(val);
      openSaveSheet();
      setInputValue("");
    } else {
      navigate(`/library?q=${encodeURIComponent(val)}`);
    }
  };

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Library", path: "/library" },
    { label: "Map", path: "/map" },
    { label: "Collections", path: "/collections" },
  ];

  const isCurrent = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "24px",
        padding: "14px 40px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E6E3DC",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
          fontWeight: 800,
          fontSize: "20px",
          letterSpacing: "-0.03em",
          color: "#1B1D1F",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "10px",
            background: "#1B1D1F",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        Wanderfile
      </Link>

      <nav aria-label="Main" className="wf-desktop-only" style={{ display: "flex", gap: "4px" }}>
        {navItems.map((item) => {
          const active = isCurrent(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: "9px 16px",
                borderRadius: "999px",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                background: active ? "#1B1D1F" : "transparent",
                color: active ? "#FFFFFF" : "#4A4E52",
                transition: "all 0.15s ease",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Omnibox / Search & Paste bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          marginLeft: "auto",
          flex: 1,
          maxWidth: "540px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <label
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "44px",
            padding: "0 8px 0 16px",
            borderRadius: "999px",
            background: "#F6F5F1",
            border: "1px solid #E6E3DC",
            color: "#6B6F73",
            boxSizing: "border-box",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
            <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </svg>
          <input
            aria-label="Paste a link to save, or search your library"
            placeholder="Paste a link to save, or search your library"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: "15px",
              color: "#1B1D1F",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={async () => {
              try {
                const clip = await navigator.clipboard.readText();
                if (clip) {
                  setInputValue(clip);
                  if (clip.startsWith("http://") || clip.startsWith("https://")) {
                    await saveUrl(clip);
                    openSaveSheet();
                    setInputValue("");
                  }
                }
              } catch {
                // Clipboard permissions might be denied
              }
            }}
            title="Paste from clipboard"
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "5px 9px",
              borderRadius: "999px",
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              color: "#1B1D1F",
              cursor: "pointer",
            }}
          >
            ⌘V
          </button>
        </label>
      </form>

      {/* Saving status indicator */}
      {savingCount > 0 ? (
        <button
          type="button"
          onClick={() => openSaveSheet()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            color: "#4A4E52",
            border: 0,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#2F9E6B",
              animation: "wf-skeleton-pulse 1.2s infinite",
            }}
          />
          Saving {savingCount}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => openSaveSheet()}
          className="wf-desktop-only"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            height: "38px",
            padding: "0 14px",
            borderRadius: "999px",
            border: "1px solid #D9D5CB",
            background: "#FFFFFF",
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: 700,
            color: "#1B1D1F",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Save
        </button>
      )}

      {/* Account menu */}
      <div style={{ position: "relative" }} ref={accountRef}>
        <button
          type="button"
          aria-label="Account menu"
          onClick={() => setIsAccountOpen((prev) => !prev)}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: 0,
            background: "#E6E3DC",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "15px",
            color: "#1B1D1F",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          V
        </button>

        {isAccountOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "48px",
              background: "#FFFFFF",
              border: "1px solid #E6E3DC",
              borderRadius: "18px",
              padding: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              minWidth: "190px",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsAccountOpen(false);
                navigate("/welcome");
              }}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: "12px",
                border: 0,
                background: "transparent",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1B1D1F",
                cursor: "pointer",
              }}
            >
              Replay the intro
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAccountOpen(false);
                navigate("/coming-soon/account-settings");
              }}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: "12px",
                border: 0,
                background: "transparent",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1B1D1F",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Account settings
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "999px",
                  background: "#ECECEA",
                  color: "#6B6F73",
                }}
              >
                Soon
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAccountOpen(false);
                navigate("/kits");
              }}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: "12px",
                border: 0,
                background: "transparent",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1B1D1F",
                cursor: "pointer",
              }}
            >
              Kits overview
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
