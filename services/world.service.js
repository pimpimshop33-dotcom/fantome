rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    function isValidString(val, maxLen) {
      return val is string && val.size() <= maxLen;
    }

    function isValidGhost() {
      let d = request.resource.data;
      return isValidString(d.message, 280)
          && isValidString(d.location, 120)
          && d.lat is number && d.lat >= -90  && d.lat <= 90
          && d.lng is number && d.lng >= -180 && d.lng <= 180
          && d.authorUid == request.auth.uid;
    }

    function isValidReply() {
      let d = request.resource.data;
      return isValidString(d.message, 280)
          && d.authorUid == request.auth.uid
          && d.ghostId is string && d.ghostId.size() > 0;
    }

    match /ghosts/{ghostId} {
      allow read: if true;

      allow create: if isAuth() && isValidGhost();

      allow update: if isAuth() && (
        (resource.data.authorUid == request.auth.uid &&
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['secret', 'radius', 'emoji', 'expired']))
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['resonances'])
          && request.resource.data.resonances == resource.data.resonances + 1)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reportCount'])
          && request.resource.data.reportCount == resource.data.reportCount + 1)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['openCount'])
          && request.resource.data.openCount == resource.data.get('openCount', 0) + 1)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['openCount', 'expired'])
          && request.resource.data.expired == true)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['expired'])
          && request.resource.data.expired == true)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['activityScore', 'lastPresenceAt'])
          && request.resource.data.activityScore == resource.data.get('activityScore', 0) + 1)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['activityScore', 'lastPresenceAt', 'discoveriesCount'])
          && request.resource.data.activityScore == resource.data.get('activityScore', 0) + 1)
        ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['state'])
          && request.resource.data.state in ['fresh', 'stable', 'weak'])
      );

      allow delete: if isAuth() && resource.data.authorUid == request.auth.uid;
    }

    match /replies/{replyId} {
      allow read: if true;
      allow create: if isAuth() && isValidReply();
      allow update: if false;
      allow delete: if isAuth() && resource.data.authorUid == request.auth.uid;
    }

    match /users/{userId} {
      allow read: if isOwner(userId);

      allow create: if isOwner(userId)
          && !('premium' in request.resource.data);

      allow update: if isOwner(userId)
          && request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['displayName', 'premium', 'premiumSince', 'lastGhostCreatedAt']);
    }

    match /premiumCodes/{code} {
      allow read: if isAuth();

      allow update: if isAuth()
          && resource.data.used == false
          && request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['used', 'usedBy', 'usedAt'])
          && request.resource.data.used == true
          && request.resource.data.usedBy == request.auth.uid;

      allow create, delete: if false;
    }

    match /discoveries/{discId} {
      allow read: if isAuth()
          && resource.data.authorUid == request.auth.uid;

      allow create: if isAuth()
          && request.resource.data.authorUid is string
          && request.resource.data.ghostId is string
          && isValidString(request.resource.data.ghostLocation, 120);

      allow update: if isAuth()
          && resource.data.authorUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['notified'])
          && request.resource.data.notified == true;

      allow delete: if false;
    }

    match /reports/{reportId} {
      allow read: if false;

      allow create: if isAuth()
          && request.resource.data.reporterUid == request.auth.uid
          && request.resource.data.reporterUid != request.resource.data.ghostAuthorUid
          && isValidString(request.resource.data.reason, 200);

      allow update, delete: if false;
    }

    match /presence/{docId} {
      allow read, write: if request.auth != null;
    }

    match /cooldowns/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }

    match /userStats/{uid} {
      allow read, write: if isOwner(uid);
    }

    match /notifications/{notifId} {
      allow read: if isAuth() && resource.data.toUid == request.auth.uid;
      allow create: if isAuth();
      allow update: if isAuth() && resource.data.toUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['notified'])
          && request.resource.data.notified == true;
      allow delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }

  }
}
