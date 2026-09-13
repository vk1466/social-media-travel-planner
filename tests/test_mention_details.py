from travelplanner.places.mention_details import compact_mention_details


EIFFEL_DETAILS = (
  "An iconic landmark and symbol of Paris, offering stunning views of the city.",
  "The iconic iron lattice tower is shown in several shots, both at sunset and during the day.",
  "The iconic Iron Lady is a must-see in Paris, especially at sunrise.",
  "The Eiffel Tower is best enjoyed with a picnic at Champ de Mars rather than going to the top.",
  "An iconic symbol of Paris, the Eiffel Tower is a must-visit landmark.",
)


def test_compact_mention_details_keeps_specific_eiffel_claims() -> None:
  compact = compact_mention_details(EIFFEL_DETAILS, place_name="Eiffel Tower")
  assert compact == (
    "The Eiffel Tower is best enjoyed with a picnic at Champ de Mars rather than going to the top.",
    "The iconic Iron Lady is a must-see in Paris, especially at sunrise.",
  )


def test_compact_mention_details_empty_when_only_brochure_copy() -> None:
  compact = compact_mention_details(
    (
      "An iconic landmark and symbol of Paris, offering stunning views of the city.",
      "An iconic symbol of Paris, the Eiffel Tower is a must-visit landmark.",
    ),
    place_name="Eiffel Tower",
  )
  assert compact == ()
