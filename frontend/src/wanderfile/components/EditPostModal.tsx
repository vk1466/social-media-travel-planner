import { useState, useEffect } from "react";
import { updatePost, parsePostId, type SavedPost } from "../../api";

interface EditPostModalProps {
  post: SavedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: SavedPost) => void;
}

export function EditPostModal({ post, isOpen, onClose, onSaved }: EditPostModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title || post.caption?.slice(0, 75) || "");
      setCategory(post.content_category || "other");
      setError(null);
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const categories = [
    { key: "travel", label: "Place (Travel)" },
    { key: "food", label: "Recipe (Food)" },
    { key: "movies", label: "Watch (Movie)" },
    { key: "fashion", label: "Fashion" },
    { key: "hairstyle", label: "Hairstyle" },
    { key: "other", label: "Other" },
  ];

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    setError(null);
    try {
      const { platform, nativeId } = parsePostId(post.post_id);
      const updated = await updatePost(platform, nativeId, {
        title: title.trim() || null,
        content_category: category,
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#FFFFFF",
          borderRadius: "24px",
          border: "1px solid #E6E3DC",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
          padding: "28px",
          position: "relative",
          boxSizing: "border-box",
          fontFamily: "'Figtree', system-ui, sans-serif",
          color: "#1B1D1F",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Edit save
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "1px solid #E6E3DC",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6B6F73",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#FCE8E6",
              color: "#D93829",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4A4E52", marginBottom: "6px" }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this save a title"
              style={{
                width: "100%",
                height: "46px",
                padding: "0 14px",
                borderRadius: "12px",
                border: "1px solid #D9D5CB",
                background: "#F6F5F1",
                fontFamily: "inherit",
                fontSize: "15px",
                color: "#1B1D1F",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4A4E52", marginBottom: "8px" }}>
              Category
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {categories.map((c) => {
                const isSelected = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    style={{
                      height: "40px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #1B1D1F" : "1px solid #E6E3DC",
                      background: isSelected ? "#1B1D1F" : "#FFFFFF",
                      color: isSelected ? "#FFFFFF" : "#1B1D1F",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              height: "44px",
              padding: "0 20px",
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              height: "44px",
              padding: "0 24px",
              borderRadius: "999px",
              border: 0,
              background: "#1B1D1F",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 700,
              color: "#FFFFFF",
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
