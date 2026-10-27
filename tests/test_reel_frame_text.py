from travelplanner.reel_frame_text import (
  adaptive_frame_timestamps,
  parse_expected_list_count,
)


def test_parse_expected_list_count():
  assert parse_expected_list_count("Top 10 places in Tokyo you must visit!") == 10
  assert parse_expected_list_count("Here are 7 hidden gems in Rome") == 7
  assert parse_expected_list_count("5 must-visit cafes in Paris") == 5
  assert parse_expected_list_count("3 of the best beaches in Bali") == 3
  assert parse_expected_list_count("Just a random stroll around the city") is None
  assert parse_expected_list_count("") is None
  assert parse_expected_list_count(None) is None


def test_adaptive_frame_timestamps():
  # Short video <= 2.0s
  assert adaptive_frame_timestamps(1.5) == (0.8,)

  # Medium video ~10s with 1.5s interval
  ts_10 = adaptive_frame_timestamps(10.0, max_frames=30, interval_s=1.5)
  assert len(ts_10) > 3
  assert ts_10[0] == 0.5
  assert 9.0 in ts_10

  # Cap at max_frames
  ts_capped = adaptive_frame_timestamps(60.0, max_frames=10, interval_s=1.5)
  assert len(ts_capped) <= 10
