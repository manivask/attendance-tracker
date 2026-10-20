# Phase 5: Firebase Authentication

## Goal

Give each teacher/admin an individual Firebase identity before Firestore access is enabled. The expected school workflow is approximately 10 teachers opening the same Cloudflare web link from their mobile phones and signing in independently.

## Authentication method

Initial pilot: Firebase Email/Password Authentication.

- No anonymous authentication.
- No public self-registration in the TBTA app.
- Teacher/admin accounts are provisioned by an administrator during the pilot.
- Password reset is supported through Firebase Authentication.
- Each signed-in user receives a Firebase UID. Phase 6 will map that UID to a `users/{uid}` Firestore profile and enforce roles/class assignments with Firestore Security Rules.

## Mobile behavior

Firebase Auth uses browser-local persistence so a teacher using their own phone does not need to sign in again on every page visit. Shared-school-computer persistence/sign-out policy must be finalized before production rollout.

## Required Firebase Console setup

1. Authentication -> Sign-in method -> enable Email/Password.
2. Authentication -> Settings -> Authorized domains -> add `attendance-tracker.manivask.workers.dev` if it is not already present.
3. Authentication -> Settings -> Password policy -> require a strong policy appropriate for school accounts.
4. Keep email enumeration protection enabled.
5. Do not enable anonymous authentication.

## Pilot account policy

Create only a small number of test accounts initially (for example one admin and two teacher test accounts). Do not add all teachers until authentication, Firestore rules, and multi-device tests pass.

## Current safety state

- Firestore rules remain deny-all.
- Firebase Authentication does not yet grant Firestore access.
- Legacy Google Sheets synchronization remains disabled on `main-firebase`.
- Production `main` remains unchanged.
- `auth.js` provides sign-in, sign-out, password reset, and auth-state observation helpers for later UI integration.

## Next step

After the provider and authorized domain are configured in Firebase Console, integrate the existing login UI with Firebase Auth and test pilot accounts. Phase 6 then introduces role/class-aware Firestore Security Rules.
