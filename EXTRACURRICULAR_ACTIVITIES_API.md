# Extracurricular Activities API

## Overview

The Extracurricular Activities API provides endpoints to manage a student's extracurricular activities. Students can create, read, update, delete, and reorder their activities. The API implements cursor-based pagination for the list endpoint and enforces per-endpoint rate limits.

## Base URL

```
/api/v1/students/me/extracurriculars
```

## Authentication

All endpoints require JWT authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

All endpoints require the `student` role.

## Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| List      | 120   | 60s    |
| Get       | 120   | 60s    |
| Create    | 30    | 60s    |
| Update    | 30    | 60s    |
| Delete    | 30    | 60s    |
| Reorder   | 30    | 60s    |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Endpoints

### 1. List Extracurricular Activities

**Endpoint:**
```
GET /api/v1/students/me/extracurriculars
```

**Query Parameters:**

| Parameter | Type   | Default | Description                                  |
|-----------|--------|---------|----------------------------------------------|
| `limit`   | number | 20      | Number of records per page (max 100)         |
| `cursor`  | string | -       | Pagination cursor from previous response     |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/students/me/extracurriculars?limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response (200 OK):**
```json
{
  "data": {
    "activities": [
      {
        "activity_id": "123",
        "activity_name": "Debate Club",
        "activity_type": "club",
        "years_involved": "2",
        "involvement_level": "leader_founder",
        "activity_description": "Founded and led the school debate club with 25 active members",
        "impact_text": "Won state championship in 2023",
        "impact_level": "created_scaled",
        "hours_per_week": "6_to_10",
        "experience_duration_weeks": 52,
        "selective_acceptance_toggle": false,
        "external_org_toggle": false,
        "travel_or_residency_toggle": true,
        "people_impacted": 25,
        "funds_raised": 0,
        "users_acquired": 0,
        "hours_delivered": 0,
        "competition_top_10_pct_toggle": true,
        "finalist_or_winner_toggle": true,
        "publication_or_presented_toggle": false,
        "policy_or_partnership_toggle": false,
        "structured_deliverable_toggle": false,
        "language_or_skill_cert_toggle": false,
        "formal_selection_toggle": false,
        "documented_real_world_output": false,
        "display_order": 1,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "has_more": true,
    "next_cursor": "eyJkaXNwbGF5X29yZGVyIjoxLCJhY3Rpdml0eV9pZCI6MTIzfQ=="
  },
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2. Get Specific Extracurricular Activity

**Endpoint:**
```
GET /api/v1/students/me/extracurriculars/:activity_id
```

**Path Parameters:**

| Parameter     | Type | Description             |
|---------------|------|-------------------------|
| `activity_id` | int  | ID of the activity      |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/students/me/extracurriculars/123" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response (200 OK):**
```json
{
  "data": {
    "activity_id": "123",
    "activity_name": "Debate Club",
    "activity_type": "club",
    "years_involved": "2",
    "involvement_level": "leader_founder",
    "activity_description": "Founded and led the school debate club with 25 active members",
    "impact_text": "Won state championship in 2023",
    "impact_level": "created_scaled",
    "hours_per_week": "6_to_10",
    "experience_duration_weeks": 52,
    "selective_acceptance_toggle": false,
    "external_org_toggle": false,
    "travel_or_residency_toggle": true,
    "people_impacted": 25,
    "funds_raised": 0,
    "users_acquired": 0,
    "hours_delivered": 0,
    "competition_top_10_pct_toggle": true,
    "finalist_or_winner_toggle": true,
    "publication_or_presented_toggle": false,
    "policy_or_partnership_toggle": false,
    "structured_deliverable_toggle": false,
    "language_or_skill_cert_toggle": false,
    "formal_selection_toggle": false,
    "documented_real_world_output": false,
    "display_order": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "NOT_FOUND",
  "message": "Extracurricular activity not found",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "FORBIDDEN",
  "message": "Access denied",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 3. Create Extracurricular Activity

**Endpoint:**
```
POST /api/v1/students/me/extracurriculars
```

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `activity_name` | string | Yes | 1-250 chars | Name of the activity |
| `activity_type` | enum | Yes | See below | Type of activity |
| `years_involved` | enum | Yes | See below | Duration involved |
| `involvement_level` | enum | Yes | See below | Level of involvement |
| `activity_description` | string | Yes | 1-400 chars | Detailed description |
| `impact_text` | string | Yes | 1-300 chars | Impact/outcome statement |
| `impact_level` | enum | Yes | See below | Level of impact |
| `hours_per_week` | enum | Yes | See below | Hours per week |
| `experience_duration_weeks` | number | No | 1-52 | Duration in weeks |
| `selective_acceptance_toggle` | boolean | No | Default: false | Selective acceptance required |
| `external_org_toggle` | boolean | No | Default: false | External organization |
| `travel_or_residency_toggle` | boolean | No | Default: false | Travel/residency involved |
| `people_impacted` | number | No | ≥ 0 | Number of people impacted |
| `funds_raised` | number | No | ≥ 0 | Funds raised (if applicable) |
| `users_acquired` | number | No | ≥ 0 | Users acquired (if applicable) |
| `hours_delivered` | number | No | ≥ 0 | Hours of service delivered |
| `competition_top_10_pct_toggle` | boolean | No | Default: false | Top 10% competition result |
| `finalist_or_winner_toggle` | boolean | No | Default: false | Finalist or winner |
| `publication_or_presented_toggle` | boolean | No | Default: false | Published or presented |
| `policy_or_partnership_toggle` | boolean | No | Default: false | Policy or partnership result |
| `structured_deliverable_toggle` | boolean | No | Default: false | Structured deliverable |
| `language_or_skill_cert_toggle` | boolean | No | Default: false | Language/skill certificate |
| `formal_selection_toggle` | boolean | No | Default: false | Formal selection/application |
| `documented_real_world_output_toggle` | boolean | No | Default: false | Documented real-world output |

**Enum Values:**

```
activity_type: 'club' | 'sport' | 'job' | 'family' | 'project' | 'research' | 'other'
years_involved: 'less_than_1' | '1' | '2' | '3' | '4_plus'
involvement_level: 'explored' | 'consistent' | 'key_contributor' | 'leader_founder'
impact_level: 'participation_only' | 'contributed' | 'measurable' | 'created_scaled'
hours_per_week: 'under_2' | '2_to_5' | '6_to_10' | '11_to_20' | '20_plus'
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/students/me/extracurriculars" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_name": "Debate Club",
    "activity_type": "club",
    "years_involved": "2",
    "involvement_level": "leader_founder",
    "activity_description": "Founded and led the school debate club with 25 active members. Organized regional tournaments.",
    "impact_text": "Won state championship in 2023. Club grew from 5 to 25 members.",
    "impact_level": "created_scaled",
    "hours_per_week": "6_to_10",
    "experience_duration_weeks": 52,
    "selective_acceptance_toggle": false,
    "external_org_toggle": false,
    "travel_or_residency_toggle": true,
    "people_impacted": 25,
    "competition_top_10_pct_toggle": true,
    "finalist_or_winner_toggle": true
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "activity_id": "123",
    "display_order": 1,
    "score_recalc_queued": true,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Response (422 Unprocessable Entity):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "fields": [
    {
      "field": "activity_description",
      "message": "String must contain at least 1 character(s)"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 4. Update Extracurricular Activity

**Endpoint:**
```
PUT /api/v1/students/me/extracurriculars/:activity_id
```

**Path Parameters:**

| Parameter     | Type | Description             |
|---------------|------|-------------------------|
| `activity_id` | int  | ID of the activity      |

**Request Body:**

All fields are optional. Only include fields you want to update.

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/v1/students/me/extracurriculars/123" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "impact_text": "Updated: Won state championship in 2024",
    "people_impacted": 30,
    "finalist_or_winner_toggle": true
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "activity_id": "123",
    "updated_fields": ["impact_text", "people_impacted", "finalist_or_winner_toggle"],
    "score_recalc_queued": true,
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "success": true,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

**Error Response (400 Bad Request - No Changes):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "No changes detected",
  "timestamp": "2024-01-15T11:00:00Z"
}
```

---

### 5. Delete Extracurricular Activity

**Endpoint:**
```
DELETE /api/v1/students/me/extracurriculars/:activity_id
```

**Path Parameters:**

| Parameter     | Type | Description             |
|---------------|------|-------------------------|
| `activity_id` | int  | ID of the activity      |

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/students/me/extracurriculars/123" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response (200 OK):**
```json
{
  "data": {
    "deleted": true
  },
  "success": true,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

---

### 6. Reorder Extracurricular Activities

**Endpoint:**
```
POST /api/v1/students/me/extracurriculars/reorder
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `activities` | array | Yes | Array of activity order objects |
| `activities[].activity_id` | string | Yes | ID of the activity |
| `activities[].display_order` | number | Yes | New display order (must be ≥ 1) |

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/students/me/extracurriculars/reorder" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "activities": [
      {
        "activity_id": "123",
        "display_order": 2
      },
      {
        "activity_id": "456",
        "display_order": 1
      }
    ]
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "updated_count": 2,
    "score_recalc_queued": true
  },
  "success": true,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

---

## Error Responses

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `FORBIDDEN` | 403 | Access denied |
| `INTERNAL_ERROR` | 500 | Server error |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `JWT_INVALID` | 401 | Invalid JWT token |
| `JWT_EXPIRED` | 401 | JWT token expired |

### Error Response Format

```json
{
  "error": "<ERROR_CODE>",
  "message": "<ERROR_MESSAGE>",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

For validation errors:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "fields": [
    {
      "field": "<FIELD_PATH>",
      "message": "<FIELD_ERROR_MESSAGE>"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Implementation Notes

### Display Order

- Activities are ordered by `display_order` (ascending)
- When creating a new activity, it automatically gets the next available `display_order`
- Use the reorder endpoint to change the display order of existing activities

### Pagination

- Cursor-based pagination is used for the list endpoint
- Cursor is base64-encoded and includes display_order and activity_id
- Include the `next_cursor` value from a previous response to fetch the next page
- `has_more` indicates if more records are available

### Score Recalculation

- Creating, updating, or deleting activities queues a score recalculation
- `score_recalc_queued` in responses indicates whether recalculation was queued
- Score recalculation is asynchronous and may take a few seconds

### Ownership Validation

- Students can only view, update, delete, or reorder their own activities
- Attempting to access another student's activity returns 403 Forbidden

### Audit Logging

- All operations are logged with audit timestamps
- Logs include action, student ID, timestamp, and any changes made

---

## Testing Guide

### Prerequisites
```bash
# Get a JWT token by registering or logging in
# Use the token for all extracurricular API requests
```

### Test Flow

1. **Create activities**
   ```bash
   # Create 3-5 different extracurricular activities
   ```

2. **List activities**
   ```bash
   # Verify all created activities appear in the list
   # Test pagination with limit parameter
   ```

3. **Get specific activity**
   ```bash
   # Retrieve details of one activity
   # Verify all fields are present
   ```

4. **Update activity**
   ```bash
   # Update one field and verify only that field is updated
   # Update multiple fields and verify all changes
   ```

5. **Reorder activities**
   ```bash
   # Reorder 3 activities and verify new order in list endpoint
   ```

6. **Delete activity**
   ```bash
   # Delete one activity and verify it no longer appears in list
   ```

7. **Error scenarios**
   ```bash
   # Try accessing activity with invalid ID (404)
   # Try accessing with invalid JWT (401)
   # Try updating with no changes (400)
   # Try exceeding rate limits (429)
   ```
