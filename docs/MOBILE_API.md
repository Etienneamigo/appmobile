# Mobile API (JWT)

Auth:
- POST /api/mobile/login  {email,password} -> {token,user}
- GET  /api/mobile/me     (Bearer) -> {user}
- GET  /api/mobile/ping   (Bearer) -> {pong,...}

Endpoints (Lot 1):
Public/Optional auth:
- GET /api/mobile/activities?search=&city=&type=&page=&pageSize=
- GET /api/mobile/activities/[id]

USER (Bearer, role USER):
- GET /api/mobile/favorites
- POST /api/mobile/favorites/[activityId]
- DELETE /api/mobile/favorites/[activityId]

ESTABLISHMENT (Bearer, role ESTABLISHMENT):
- GET   /api/mobile/establishment
- PATCH /api/mobile/establishment
- GET   /api/mobile/establishment/activity
- PATCH /api/mobile/establishment/activity
- GET   /api/mobile/establishment/media
- POST  /api/mobile/establishment/media
- DELETE /api/mobile/establishment/media/[id]

ADMIN (Bearer, role ADMIN):
- GET /api/mobile/admin/stats
