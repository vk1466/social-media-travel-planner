import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { nativePostId } from "@/src/api";
import { CoverCard } from "@/src/components/CoverCard";
import { FilterBar, PageHeading } from "@/src/components/LibraryChrome";
import { Button, EmptyState, ErrorBanner } from "@/src/components/ui";
import { postsOfCategory } from "@/src/contentCategory";
import { useLibrary } from "@/src/context/LibraryContext";
import { postsForPlatforms, useLibraryPlatform } from "@/src/libraryPlatform";
import { aggregateMovies, type AggregatedMovie } from "@/src/movies";
import {
  formatPostDate,
  getPlatformLabel,
  proxiedMediaUrl,
} from "@/src/postDisplayUtils";
import { colors, radius, shadow, spacing } from "@/src/theme";

const GRID_GAP = 12;

function formatDuration(
  minutes?: number | null,
  seasons?: number | null,
  isTv?: boolean,
): string | null {
  if (isTv && seasons && seasons > 0) {
    return `${seasons} season${seasons === 1 ? "" : "s"}`;
  }
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function movieCoverFields(movie: AggregatedMovie) {
  const isTv = movie.kind === "tv";
  const duration = formatDuration(movie.runtime_minutes, movie.number_of_seasons, isTv);
  const reelCount = movie.source_posts.length;
  const displayPoster =
    movie.poster_url ||
    (movie.source_posts[0]?.thumbnail_url
      ? proxiedMediaUrl(movie.source_posts[0].thumbnail_url)
      : null);
  const location = [movie.year ? String(movie.year) : null, duration].filter(Boolean).join(" · ");
  const meta = [
    movie.imdb_rating != null ? `IMDb ${movie.imdb_rating.toFixed(1)}` : null,
    movie.rotten_tomatoes_percent != null ? `${movie.rotten_tomatoes_percent}% RT` : null,
    reelCount > 1 ? `${reelCount} reels` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const kicker =
    movie.watch_providers.slice(0, 2).join(" · ") ||
    movie.genres.slice(0, 2).join(" · ") ||
    (isTv ? "Series" : "Feature");

  return {
    isTv,
    displayPoster,
    location: location || (isTv ? "TV Series" : "Movie"),
    meta: meta || "Saved to watch",
    kicker,
  };
}

function ImdbBadge({ rating }: { rating: number }) {
  return (
    <View style={styles.ratingBadge}>
      <Text style={styles.ratingIcon}>★</Text>
      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function RtBadge({ percent }: { percent: number }) {
  const isFresh = percent >= 60;
  return (
    <View style={[styles.ratingBadge, isFresh ? styles.rtFresh : styles.rtRotten]}>
      <Text style={styles.ratingIcon}>{isFresh ? "🍅" : "🟢"}</Text>
      <Text style={styles.ratingValue}>{percent}%</Text>
    </View>
  );
}

function MovieDetailSheet({
  movie,
  onClose,
  onOpenPost,
}: {
  movie: AggregatedMovie;
  onClose: () => void;
  onOpenPost: (platform: string, postId: string) => void;
}) {
  const isTv = movie.kind === "tv";
  const posterUrl =
    movie.poster_url ||
    (movie.source_posts[0]?.thumbnail_url
      ? proxiedMediaUrl(movie.source_posts[0].thumbnail_url)
      : null);
  const backdropUrl = movie.backdrop_url || posterUrl;
  const trailerKey = movie.trailer_youtube_key;
  const tmdbUrl = movie.tmdb_id
    ? `https://www.themoviedb.org/${isTv ? "tv" : "movie"}/${movie.tmdb_id}`
    : null;
  const runtime = movie.runtime_minutes;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <View style={styles.heroWrap}>
          {backdropUrl ? (
            <Image source={{ uri: backdropUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroEmpty]} />
          )}
          <View style={styles.heroScrim} />
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close details">
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.detailBody}>
          <View style={styles.posterCol}>
            {posterUrl ? (
              <View style={styles.detailPosterWrap}>
                <Image source={{ uri: posterUrl }} style={styles.detailPoster} resizeMode="cover" />
              </View>
            ) : (
              <View style={[styles.detailPosterWrap, styles.posterEmpty]}>
                <Text style={styles.posterEmptyIcon}>🎬</Text>
                <Text style={styles.posterEmptyTitle} numberOfLines={3}>
                  {movie.title}
                </Text>
              </View>
            )}
            {trailerKey ? (
              <Button
                label="Watch Trailer"
                icon="play"
                onPress={() =>
                  void Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`)
                }
                style={styles.trailerBtn}
              />
            ) : null}
            {tmdbUrl ? (
              <Pressable
                style={styles.tmdbLink}
                onPress={() => void Linking.openURL(tmdbUrl)}
              >
                <Text style={styles.tmdbLinkText}>View on TMDB ↗</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.infoCol}>
            <View style={styles.typeRow}>
              <Text style={styles.kindBadge}>{isTv ? "TV Series" : "Movie"}</Text>
              {movie.year ? <Text style={styles.yearText}>{movie.year}</Text> : null}
              {isTv && movie.number_of_seasons ? (
                <Text style={styles.runtimeText}>
                  {movie.number_of_seasons} season{movie.number_of_seasons === 1 ? "" : "s"}
                </Text>
              ) : runtime ? (
                <Text style={styles.runtimeText}>
                  {Math.floor(runtime / 60)}h {runtime % 60}m
                </Text>
              ) : null}
            </View>

            <Text style={styles.detailTitle}>{movie.title}</Text>

            {movie.genres.length > 0 ? (
              <Text style={styles.genres}>{movie.genres.join(" · ")}</Text>
            ) : null}

            {(movie.imdb_rating != null || movie.rotten_tomatoes_percent != null) && (
              <View style={styles.ratingsRow}>
                {movie.imdb_rating != null ? <ImdbBadge rating={movie.imdb_rating} /> : null}
                {movie.rotten_tomatoes_percent != null ? (
                  <RtBadge percent={movie.rotten_tomatoes_percent} />
                ) : null}
              </View>
            )}

            {movie.watch_providers.length > 0 ? (
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>Where to stream</Text>
                <View style={styles.providerRow}>
                  {movie.watch_providers.map((provider) => (
                    <View key={provider} style={styles.providerPill}>
                      <Text style={styles.providerText}>{provider}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {movie.plot_summary ? (
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>Overview</Text>
                <Text style={styles.synopsis}>{movie.plot_summary}</Text>
              </View>
            ) : null}

            {movie.review_summary ? (
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>Critical consensus</Text>
                <Text style={styles.reviewQuote}>“{movie.review_summary}”</Text>
              </View>
            ) : null}

            {(movie.directors.length > 0 || movie.cast.length > 0) && (
              <View style={styles.detailSection}>
                {movie.directors.length > 0 ? (
                  <Text style={styles.crewLine}>
                    <Text style={styles.crewLabel}>Director: </Text>
                    {movie.directors.join(", ")}
                  </Text>
                ) : null}
                {movie.cast.length > 0 ? (
                  <Text style={styles.crewLine}>
                    <Text style={styles.crewLabel}>Starring: </Text>
                    {movie.cast.join(", ")}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {movie.source_posts.length > 0 ? (
          <View style={styles.sourcesSection}>
            <Text style={styles.sourcesTitle}>
              Saved in {movie.source_posts.length}{" "}
              {movie.source_posts.length === 1 ? "reel" : "reels"}
            </Text>
            {movie.source_posts.map((post) => {
              const thumb = proxiedMediaUrl(post.thumbnail_url);
              const date = formatPostDate(post);
              const platform = getPlatformLabel(post);
              return (
                <Pressable
                  key={post.post_id}
                  style={styles.sourceCard}
                  onPress={() => onOpenPost(post.platform, nativePostId(post))}
                >
                  <View style={styles.sourceThumbWrap}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.sourceThumb} />
                    ) : (
                      <View style={[styles.sourceThumb, styles.sourceThumbEmpty]} />
                    )}
                    <Text style={styles.sourcePlatform}>{platform}</Text>
                  </View>
                  <View style={styles.sourceMeta}>
                    <Text style={styles.sourceAuthor}>
                      {post.author_handle ? `@${post.author_handle}` : "Reel"}
                    </Text>
                    {post.reel_summary ? (
                      <Text style={styles.sourceExcerpt} numberOfLines={2}>
                        {post.reel_summary}
                      </Text>
                    ) : post.caption ? (
                      <Text style={styles.sourceExcerpt} numberOfLines={2}>
                        {post.caption.slice(0, 100)}
                      </Text>
                    ) : null}
                    {date ? <Text style={styles.sourceDate}>{date}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

export default function MoviesScreen() {
  const router = useRouter();
  const { posts, loading, error } = useLibrary();
  const { platforms } = useLibraryPlatform();
  const [kind, setKind] = useState<"all" | "movie" | "tv">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AggregatedMovie | null>(null);

  const movies = useMemo(
    () => aggregateMovies(postsForPlatforms(postsOfCategory(posts, "movies"), platforms)),
    [posts, platforms],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return movies.filter((movie) => {
      if (kind !== "all" && movie.kind !== kind) return false;
      if (needle && !`${movie.title} ${movie.genres.join(" ")}`.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [movies, kind, query]);

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? <ErrorBanner message={error} /> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeading
              kicker="Titles from your saves"
              title="What to watch next"
              lede="Keep films, series, and documentaries together, with streaming details when available."
              count={{ value: filtered.length, label: "titles" }}
            />
            <FilterBar
              placeholder="Search titles"
              query={query}
              onQuery={setQuery}
              groups={[
                {
                  ariaLabel: "Kind",
                  selected: kind,
                  onSelect: (value) => setKind(value as typeof kind),
                  options: [
                    { value: "all", label: "All" },
                    { value: "movie", label: "Movies" },
                    { value: "tv", label: "TV" },
                  ],
                },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing to watch yet"
            body="Save movie and TV posts to build a watchlist."
            icon="film-outline"
          />
        }
        renderItem={({ item }) => {
          const fields = movieCoverFields(item);
          return (
            <View style={styles.gridCell}>
              <CoverCard
                title={item.title}
                category={fields.isTv ? "TV Series" : "Movie"}
                location={fields.location}
                meta={fields.meta}
                action="Watch ↗"
                imageUrl={fields.displayPoster}
                onPress={() => setSelected(item)}
                accessibilityLabel={`View details for ${item.title}`}
                badge={
                  item.trailer_youtube_key ? (
                    <Pressable
                      style={styles.playBadge}
                      onPress={() =>
                        void Linking.openURL(
                          `https://www.youtube.com/watch?v=${item.trailer_youtube_key}`,
                        )
                      }
                      accessibilityLabel={`Watch ${item.title} trailer`}
                    >
                      <Ionicons name="play" size={14} color={colors.ink} />
                    </Pressable>
                  ) : undefined
                }
              />
            </View>
          );
        }}
      />
      {selected ? (
        <MovieDetailSheet
          movie={selected}
          onClose={() => setSelected(null)}
          onOpenPost={(platform, postId) => {
            setSelected(null);
            router.push(`/posts/${platform}/${postId}`);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  list: { padding: spacing.md, flexGrow: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.md, width: "100%" },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCell: { flex: 1, minWidth: 0 },
  playBadge: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetContent: { paddingBottom: spacing.xl },
  heroWrap: { height: 180, position: "relative" },
  heroImage: { ...StyleSheet.absoluteFill, backgroundColor: colors.brandSoft },
  heroEmpty: { backgroundColor: colors.surfaceAlt },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 42, 53, 0.55)",
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(17, 42, 53, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  detailBody: { padding: spacing.lg, gap: spacing.lg },
  posterCol: { alignItems: "flex-start", gap: spacing.sm },
  detailPosterWrap: {
    width: 120,
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    overflow: "hidden",
    ...shadow(2),
  },
  detailPoster: {
    width: "100%",
    height: "100%",
  },
  posterEmpty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  posterEmptyIcon: { fontSize: 28, marginBottom: 6 },
  posterEmptyTitle: { color: colors.muted, fontSize: 11, textAlign: "center" },
  trailerBtn: { alignSelf: "stretch" },
  tmdbLink: { paddingVertical: 4 },
  tmdbLinkText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  infoCol: { flex: 1, gap: spacing.sm },
  typeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  kindBadge: {
    backgroundColor: colors.brandSoft,
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  yearText: { color: colors.muted, fontSize: 13 },
  runtimeText: { color: colors.muted, fontSize: 13 },
  detailTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  genres: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  ratingsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rtFresh: { borderColor: "#2e7d52" },
  rtRotten: { borderColor: colors.muted },
  ratingIcon: { fontSize: 12 },
  ratingValue: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  detailSection: { marginTop: spacing.sm, gap: 6 },
  sectionLabel: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  providerPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  providerText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  synopsis: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  reviewQuote: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
  },
  crewLine: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  crewLabel: { fontWeight: "700", color: colors.muted },
  sourcesSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  sourcesTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  sourceCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow(1),
  },
  sourceThumbWrap: { width: 72, position: "relative" },
  sourceThumb: {
    width: 72,
    height: 96,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  sourceThumbEmpty: { backgroundColor: colors.surfaceAlt },
  sourcePlatform: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(17, 42, 53, 0.8)",
    color: colors.onFill,
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: "hidden",
  },
  sourceMeta: { flex: 1, gap: 2 },
  sourceAuthor: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  sourceExcerpt: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  sourceDate: { color: colors.faint, fontSize: 11, marginTop: 2 },
});
