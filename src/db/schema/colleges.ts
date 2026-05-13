/**
 * `colleges` table — master college dataset for 8-step Academic Fit classification.
 * Source: unilantern_sqlserver_part2_tables16to25.sql TABLE 16
 * Logo URLs are CDN-cached and lazy-loaded. Scheduled refresh jobs update data.
 */

export const COLLEGES_TABLE = "colleges";

export const collegesColumns = {
  college_id:       "college_id",
  name:             "name",
  city:             "city",
  state:            "state",
  region:           "region",
  institution_type: "institution_type",
  is_public:        "is_public",
  website_url:      "website_url",
  acceptance_rate:  "acceptance_rate",
  is_test_optional: "is_test_optional",
  gpa_25th:         "gpa_25th",
  gpa_75th:         "gpa_75th",
  sat_25th:         "sat_25th",
  sat_75th:         "sat_75th",
  act_25th:         "act_25th",
  act_75th:         "act_75th",
  logo_url:         "logo_url",
  data_source:      "data_source",
  last_data_refresh:"last_data_refresh",
  is_active:        "is_active",
  created_at:       "created_at",
  updated_at:       "updated_at",
} as const;
