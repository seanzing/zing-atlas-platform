# Gmail Pub/Sub Setup

Run these commands in Google Cloud Console (or gcloud CLI):

## 1. Enable Pub/Sub API
```bash
gcloud services enable pubsub.googleapis.com
```

## 2. Create a topic
```bash
gcloud pubsub topics create atlas-gmail
```

## 3. Grant Gmail publish permission
```bash
gcloud pubsub topics add-iam-policy-binding atlas-gmail \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

## 4. Create a push subscription pointing to Atlas
```bash
gcloud pubsub subscriptions create atlas-gmail-sub \
  --topic=atlas-gmail \
  --push-endpoint=https://zing-atlas-platform-production.up.railway.app/api/gmail/webhook \
  --ack-deadline=30
```

## 5. Add to Atlas Railway env vars
```
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/atlas-gmail
```

## 6. Set up watch renewal cron (every 6 days)
Call `POST /api/gmail/renew-watch` with `Authorization: Bearer $INTERNAL_API_SECRET` header.
Gmail watch expires every 7 days, so renew every 6 days to be safe.

## How it works

Once set up, every team member who connects their Google account will automatically
receive real-time reply notifications in Atlas with no polling needed.

1. `gmail.users.watch()` is called when a team member connects Google (OAuth callback)
2. Gmail sends a Pub/Sub notification when a new email arrives
3. Atlas webhook receives the notification, fetches the message, and logs it to ActivityLog
4. The Activity tab auto-refreshes every 60s to pick up new entries
