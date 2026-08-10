import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchPlaces, fetchVisitedPlaceIds, type Place } from "../api";
import { toAtlasPlaces, type AtlasPlace } from "../placeAtlasModel";

interface PlaceAtlasOptions {
  /** Demo pages may fall back to the sample atlas; production must not. */
  allowSample?: boolean;
}

interface PlaceAtlasResult {
  places: AtlasPlace[];
  apiPlaces: Place[];
  visitedIds: Set<string>;
  loading: boolean;
  usingSampleData: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads the signed-in user's places plus their visit log as a flat list; the
 * concepts build their own tree from it so filters and grouping can change
 * the shape. Demo pages may fall back to the sample atlas for depth/scale;
 * production passes `allowSample: false`.
 */
export function usePlaceAtlas(
  authReady: boolean,
  options: PlaceAtlasOptions = {},
): PlaceAtlasResult {
  const allowSample = options.allowSample !== false;
  const [apiPlaces, setApiPlaces] = useState<Place[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts: { showLoading: boolean }) => {
      if (!authReady) {
        setApiPlaces([]);
        setVisitedIds(new Set());
        setLoading(false);
        return;
      }
      if (opts.showLoading) {
        setLoading(true);
      }
      try {
        const [nextPlaces, visited] = await Promise.all([
          fetchPlaces(),
          fetchVisitedPlaceIds(),
        ]);
        setApiPlaces(nextPlaces);
        setVisitedIds(new Set(visited));
      } catch {
        setApiPlaces([]);
        setVisitedIds(new Set());
      } finally {
        if (opts.showLoading) {
          setLoading(false);
        }
      }
    },
    [authReady],
  );

  useEffect(() => {
    void load({ showLoading: true });
  }, [load]);

  const refresh = useCallback(async () => {
    await load({ showLoading: false });
  }, [load]);

  const { places, usingSampleData } = useMemo(
    () => toAtlasPlaces(apiPlaces, visitedIds, { allowSample }),
    [apiPlaces, visitedIds, allowSample],
  );

  return { places, apiPlaces, visitedIds, loading, usingSampleData, refresh };
}
