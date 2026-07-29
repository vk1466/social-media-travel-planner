from travelplanner.db import jobs_repo
from travelplanner.personas.link_ingest import IngestResult

from server.workers import finalize_job, ingest_one_link


def test_ingest_one_link_updates_job(monkeypatch, dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/w1/"],
    user_id="user-a",
    refresh=False,
  )

  monkeypatch.setattr(
    "server.workers.ingest_link",
    lambda post_url, *, user_id, refresh=False, mark_visited=False: IngestResult(
      post_url=post_url,
      outcome="saved",
      post_id="instagram:w1",
    ),
  )

  result = ingest_one_link(
    {
      "job_id": job_id,
      "post_url": "https://www.instagram.com/p/w1/",
      "user_id": "user-a",
      "refresh": False,
    }
  )
  assert result["status"] == "saved"

  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert job["items"][0]["status"] == "saved"
  assert job["items"][0]["post_id"] == "instagram:w1"


def test_ingest_one_link_records_errors(monkeypatch, dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/boom/"],
    user_id="user-a",
    refresh=False,
  )

  def boom(post_url: str, *, user_id, refresh=False, mark_visited=False) -> IngestResult:
    raise RuntimeError("upstream failed")

  monkeypatch.setattr("server.workers.ingest_link", boom)

  result = ingest_one_link(
    {
      "job_id": job_id,
      "post_url": "https://www.instagram.com/p/boom/",
      "user_id": "user-a",
      "refresh": False,
    }
  )
  assert result["status"] == "error"

  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert job["items"][0]["status"] == "error"
  assert "upstream failed" in (job["items"][0].get("error_message") or "")


def test_ingest_one_link_auto_marks_visited(monkeypatch, dynamodb) -> None:
  from travelplanner.models import PlaceLocation, Platform, SavedPost
  from travelplanner.place_hints import PlaceMention
  from travelplanner.places import upsert_place
  from travelplanner.store import save_post
  from travelplanner.visits import visited_place_ids

  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    PlaceLocation(
      display_name="Multnomah Falls",
      continent="North America",
      country="United States",
      country_code="US",
      state_province="Oregon",
      city="Portland",
      latitude=45.5762,
      longitude=-122.1158,
      provider_place_id="falls-1",
    ),
    "instagram:w1",
  )
  post = SavedPost(
    post_id="instagram:w1",
    post_url="https://www.instagram.com/p/w1/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="falls",
    fetched_at="2024-06-12T12:00:00Z",
    posted_at="2024-06-12T12:00:00Z",
    place_ids=(place_id,),
  )
  save_post(post)

  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/w1/"],
    user_id="user-a",
    refresh=False,
    kind=jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT,
    username="traveler",
  )

  def fake_ingest(post_url: str, *, user_id, refresh=False, mark_visited=False):
    result = IngestResult(
      post_url=post_url,
      outcome="saved",
      post_id="instagram:w1",
    )
    if mark_visited:
      from travelplanner.store import load_post_by_id
      from travelplanner.visits import mark_visited as mark_visit_fn

      post = load_post_by_id(result.post_id)
      if post is not None:
        for linked_place_id in post.place_ids:
          mark_visit_fn(user_id=user_id, place_id=linked_place_id, source="instagram")
    return result

  monkeypatch.setattr("server.workers.ingest_link", fake_ingest)

  result = ingest_one_link(
    {
      "job_id": job_id,
      "post_url": "https://www.instagram.com/p/w1/",
      "user_id": "user-a",
      "refresh": False,
      "mark_visited": True,
    }
  )
  assert result["status"] == "saved"
  assert place_id in visited_place_ids("user-a")


def test_timeline_batch_uses_whole_export_for_trip_context(monkeypatch, dynamodb) -> None:
  import boto3

  from travelplanner.models import PlaceLocation
  from travelplanner.steps import locate_by_name
  from travelplanner.visits import list_visits

  from server import timeline_staging
  from server.workers import process_timeline_batch

  monkeypatch.setenv("TIMELINE_IMPORTS_BUCKET", "timeline-test")
  boto3.client("s3", region_name="us-east-1").create_bucket(Bucket="timeline-test")

  def fake_locate_debug(mention, **kwargs):
    from travelplanner.places.locate import LocateDebugResult

    return LocateDebugResult(
      status="resolved",
      location=PlaceLocation(
        display_name=mention.place_name,
        country="United States",
        country_code="US",
        state_province="Washington",
        latitude=mention.latitude,
        longitude=mention.longitude,
        osm_class="amenity",
        osm_type="restaurant",
      ),
    )

  monkeypatch.setattr(locate_by_name, "locate_mention_debug", fake_locate_debug)

  def cluster(latitude, longitude, day, name, semantic_type):
    return {
      "latitude": latitude,
      "longitude": longitude,
      "visited_from": day,
      "visited_to": day,
      "place_name": name,
      "google_place_id": f"g:{name}",
      "address": None,
      "visit_count": 1,
      "semantic_type": semantic_type,
    }

  s3_key = "timeline/user-a/export.json"
  timeline_staging.put_json(
    s3_key,
    {
      "clusters": [
        cluster(46.05, -122.60, "2024-06-01", "Viewpoint A", "TYPE_TOURIST_ATTRACTION"),
        cluster(46.06, -122.61, "2024-06-02", "Viewpoint B", "TYPE_TOURIST_ATTRACTION"),
        cluster(46.07, -122.62, "2024-06-02", "Trattoria Nowhere", "TYPE_RESTAURANT"),
      ]
    },
  )

  job_id = jobs_repo.create_timeline_job(
    user_id="user-a",
    s3_key=s3_key,
    source_format="phone",
    total_places=3,
    batch_size=1,
    home_latitude=45.5,
    home_longitude=-122.6,
  )

  out = process_timeline_batch(
    {
      "job_id": job_id,
      "user_id": "user-a",
      "s3_key": s3_key,
      "post_url": "timeline-batch:2",
      "batch_index": 2,
      "batch_start": 2,
      "batch_count": 1,
      "source_format": "phone",
      "home_latitude": 45.5,
      "home_longitude": -122.6,
    }
  )
  assert out["status"] == "saved"
  assert out["imported"] == 1
  assert [visit.place_name for visit in list_visits("user-a")] == ["Trattoria Nowhere"]

  job = jobs_repo.get_job(job_id)
  stats = job["items"][2]["stats"]
  assert stats["imported"] == 1
  assert stats["skipped_chain"] == 0


def test_finalize_job_marks_done(monkeypatch, dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/x/"],
    user_id="user-a",
    refresh=False,
  )
  called = {"link": False}

  def fake_link() -> None:
    called["link"] = True

  monkeypatch.setattr("server.workers.link_places", fake_link)

  out = finalize_job({"job_id": job_id})
  assert out["status"] == "done"
  assert called["link"] is True
  assert jobs_repo.get_job(job_id)["status"] == "done"
