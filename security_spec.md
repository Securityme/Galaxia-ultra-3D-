# Security Specification — GALAXIA ULTRA • Pax Historia 3D

## 1. Data Invariants
1. **Default Deny**: All unmatched paths are strictly denied (`allow read, write: if false;`).
2. **Verified Authentication**: All standard reads/writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **PII Isolation**: `/users/{userId}` stores only non-PII commander profile metadata (`uid`, `displayName`, `photoURL`, `imperialTitle`, `lastActiveWorldName`, `createdAt`, `updatedAt`). Access is strictly restricted to the owner (`request.auth.uid == userId`).
4. **Cloud Save Ownership**: `/worldSaves/{saveId}` documents require `ownerId == request.auth.uid`. List queries enforce `resource.data.ownerId == request.auth.uid`.
5. **Immutable Identity & Temporal Integrity**: `uid`, `ownerId`, `saveId`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Payloads
1. Unauthenticated read/write to `/users/user_1`.
2. Unverified email write (`email_verified == false`) to `/users/user_1`.
3. Cross-user read (`auth.uid = user_2`) on `/users/user_1`.
4. Shadow field injection (`isAdmin: true`) on `/users/user_1`.
5. Oversized `displayName` (> 80 chars) on `/users/user_1`.
6. Mutating `createdAt` or `uid` during update on `/users/user_1`.
7. Creating `/worldSaves/save_1` with `ownerId != request.auth.uid`.
8. Updating `/worldSaves/save_1` to transfer `ownerId` to another user.
9. Blanket `list` query on `/worldSaves` without `where('ownerId', '==', auth.uid)`.
10. Injecting invalid ID characters (`saveId` > 128 chars or non-alphanumeric) in path variable.
11. Client-spoofed `updatedAt` timestamp (`updatedAt != request.time`).
12. Deleting another user's save document (`/worldSaves/save_other`).
